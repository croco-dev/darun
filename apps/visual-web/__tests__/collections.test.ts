import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedItem } from '../features/collections/collectionStore';
import type * as StoreModule from '../features/collections/collectionStore';

const KEY = 'darun-visual-collections-v1';

function shot(overrides: Partial<SavedItem> = {}): SavedItem {
  return {
    kind: 'screenshot',
    id: 's1',
    title: 'T',
    imageUrl: '/i.png',
    href: '/screenshots/s1',
    productName: 'P',
    ...overrides,
  };
}

function installWindow(
  opts: {
    seed?: string;
    setItem?: (key: string, value: string) => void;
    blockAccess?: boolean;
  } = {}
): Record<string, string> {
  const backing: Record<string, string> = {};
  if (opts.seed !== undefined) backing[KEY] = opts.seed;
  const win: Record<string, unknown> = { addEventListener: () => {} };
  if (opts.blockAccess) {
    Object.defineProperty(win, 'localStorage', {
      get(): never {
        throw new Error('denied');
      },
    });
  } else {
    win.localStorage = {
      getItem: (k: string) => backing[k] ?? null,
      setItem: (k: string, v: string) => (opts.setItem ? opts.setItem(k, v) : void (backing[k] = v)),
      removeItem: (k: string) => void delete backing[k],
      clear: () => void Object.keys(backing).forEach(k => delete backing[k]),
      key: () => null,
      length: 0,
    };
  }
  (globalThis as Record<string, unknown>).window = win;
  return backing;
}
// Dynamic import: store holds singleton module state; vi.resetModules + fresh
// import isolates state per test — static import cannot work.
async function freshStore(): Promise<typeof StoreModule> {
  vi.resetModules();
  return await import('../features/collections/collectionStore');
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  vi.resetModules();
});

describe('collections persistence', () => {
  it('같은 kind+id를 두 번 토글하면 항목이 제거된다', async () => {
    installWindow();
    const s = await freshStore();
    const c = s.createCollection('A');
    expect(c).not.toBeNull();
    s.toggleInCollection(c!.id, shot());
    expect(s.savedIn('screenshot', 's1').map(x => x.id)).toEqual([c!.id]);
    s.toggleInCollection(c!.id, shot());
    expect(s.savedIn('screenshot', 's1')).toEqual([]);
  });

  it('같은 id라도 kind가 다르면 별개 항목이다', async () => {
    installWindow();
    const s = await freshStore();
    const c = s.createCollection('A');
    s.toggleInCollection(c!.id, shot({ kind: 'screenshot' }));
    s.toggleInCollection(c!.id, shot({ kind: 'flow', href: '/flows/s1' }));
    s.removeFromCollection(c!.id, 'screenshot', 's1');
    expect(s.savedIn('screenshot', 's1')).toEqual([]);
    expect(s.savedIn('flow', 's1').map(x => x.id)).toEqual([c!.id]);
  });

  it('저장 후 리로드해도 이름과 항목이 유지되고 삭제도 반영된다', async () => {
    const backing = installWindow();
    const s = await freshStore();
    const c = s.createCollection('Mine');
    s.toggleInCollection(c!.id, shot());
    expect(backing[KEY]).toContain('Mine');

    const r = await freshStore();
    const found = r.savedIn('screenshot', 's1');
    expect(found.map(x => x.name)).toEqual(['Mine']);
    r.removeFromCollection(found[0].id, 'screenshot', 's1');
    expect(r.savedIn('screenshot', 's1')).toEqual([]);
    expect((await freshStore()).savedIn('screenshot', 's1')).toEqual([]);
  });

  it('읽기 차단된 저장소에서도 죽지 않고 create는 null을 반환한다', async () => {
    installWindow({ blockAccess: true });
    const s = await freshStore();
    expect(() => s.createCollection('A')).not.toThrow();
    expect(s.createCollection('A')).toBeNull();
  });

  it('쓰기 실패는 성공한 것처럼 주장하지 않는다', async () => {
    installWindow({
      seed: JSON.stringify([{ id: 'c1', name: 'Seed', createdAt: 1, items: [] }]),
      setItem: () => {
        throw new Error('quota');
      },
    });
    const s = await freshStore();
    expect(s.createCollection('New')).toBeNull();
    s.toggleInCollection('c1', shot());
    expect(s.savedIn('screenshot', 's1')).toEqual([]);
  });

  it('persist된 unsafe href는 로드 시 제외된다', async () => {
    installWindow({
      seed: JSON.stringify([
        {
          id: 'c1',
          name: 'Seed',
          createdAt: 1,
          items: [shot({ id: 'good', href: '/screenshots/good' }), shot({ id: 'evil', href: 'javascript:alert(1)' })],
        },
      ]),
    });
    const s = await freshStore();
    expect(s.savedIn('screenshot', 'good').map(c => c.id)).toEqual(['c1']);
    expect(s.savedIn('screenshot', 'evil')).toEqual([]);
  });
});
