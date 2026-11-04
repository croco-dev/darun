import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedItem } from '../features/collections/collectionStore';
import type * as StoreModule from '../features/collections/collectionStore';

vi.mock('../features/collections/collectionPersistence', () => import('./fixtures/collectionPersistence'));

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
    locksUnavailable?: boolean;
    rejectLock?: boolean;
    beforeWrite?: () => void;
  } = {}
): Record<string, string> {
  const backing: Record<string, string> = {};
  if (opts.seed !== undefined) backing[KEY] = opts.seed;
  const lockTails = new Map<string, Promise<void>>();
  const win: Record<string, unknown> = {
    addEventListener: () => {},
    navigator: {
      locks: opts.locksUnavailable
        ? undefined
        : {
            request<T>(name: string, write: () => T): Promise<T> {
              if (opts.rejectLock) return Promise.reject(new Error('lock unavailable'));
              const result = (lockTails.get(name) ?? Promise.resolve()).then(write);
              lockTails.set(
                name,
                result.then(
                  () => {},
                  () => {}
                )
              );
              return result;
            },
          },
    },
  };
  if (opts.blockAccess) {
    Object.defineProperty(win, 'localStorage', {
      get(): never {
        throw new Error('denied');
      },
    });
  } else {
    win.localStorage = {
      getItem: (k: string) => backing[k] ?? null,
      setItem: (k: string, v: string) => {
        opts.beforeWrite?.();
        if (opts.setItem) opts.setItem(k, v);
        else backing[k] = v;
      },
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
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('collections persistence', () => {
  it('같은 kind+id를 두 번 추가해도 하나만 저장되고 제거할 수 있다', async () => {
    installWindow();
    const s = await freshStore();
    const c = await s.createCollection('A');
    expect(c).not.toBeNull();
    await s.addToCollection(c!.id, shot());
    expect((await s.savedIn('screenshot', 's1')).map(x => x.id)).toEqual([c!.id]);
    await s.addToCollection(c!.id, shot());
    expect((await s.savedIn('screenshot', 's1'))[0].items).toEqual([shot()]);
    await s.removeFromCollection(c!.id, 'screenshot', 's1');
    expect(await s.savedIn('screenshot', 's1')).toEqual([]);
  });

  it('같은 id라도 kind가 다르면 별개 항목이다', async () => {
    installWindow();
    const s = await freshStore();
    const c = await s.createCollection('A');
    await s.addToCollection(c!.id, shot({ kind: 'screenshot' }));
    await s.addToCollection(c!.id, shot({ kind: 'flow', href: '/flows/s1' }));
    await s.removeFromCollection(c!.id, 'screenshot', 's1');
    expect(await s.savedIn('screenshot', 's1')).toEqual([]);
    expect((await s.savedIn('flow', 's1')).map(x => x.id)).toEqual([c!.id]);
  });

  it('저장 후 리로드해도 이름과 항목이 유지되고 삭제도 반영된다', async () => {
    const backing = installWindow();
    const s = await freshStore();
    const c = await s.createCollection('Mine');
    await s.addToCollection(c!.id, shot());
    expect(backing[KEY]).toContain('Mine');

    const r = await freshStore();
    const found = await r.savedIn('screenshot', 's1');
    expect(found.map(x => x.name)).toEqual(['Mine']);
    await r.removeFromCollection(found[0].id, 'screenshot', 's1');
    expect(await r.savedIn('screenshot', 's1')).toEqual([]);
    expect(await (await freshStore()).savedIn('screenshot', 's1')).toEqual([]);
  });

  it('읽기 차단된 저장소에서도 죽지 않고 create는 null을 반환한다', async () => {
    installWindow({ blockAccess: true });
    const s = await freshStore();
    await expect(s.createCollection('A')).resolves.toBeNull();
  });

  it('쓰기 실패는 성공한 것처럼 주장하지 않는다', async () => {
    installWindow({
      seed: JSON.stringify([{ id: 'c1', name: 'Seed', createdAt: 1, items: [] }]),
      setItem: () => {
        throw new Error('quota');
      },
    });
    const s = await freshStore();
    await expect(s.createCollection('New')).resolves.toBeNull();
    await s.addToCollection('c1', shot());
    expect(await s.savedIn('screenshot', 's1')).toEqual([]);
  });

  it('randomUUID 없이 getRandomValues만 있어도 서로 다른 컬렉션이 유지된다', async () => {
    const backing = installWindow();
    let counter = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        counter += 1;
        array.fill(counter);
        return array;
      },
    });
    const s = await freshStore();
    const first = await s.createCollection('First');
    const second = await s.createCollection('Second');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toMatch(/^c-[0-9a-f]{32}$/);
    expect(second!.id).toMatch(/^c-[0-9a-f]{32}$/);
    expect(first!.id).not.toBe(second!.id);
    await s.addToCollection(first!.id, shot());
    await s.addToCollection(second!.id, shot({ id: 's2', href: '/screenshots/s2' }));

    const reloaded = await freshStore();
    expect((await reloaded.savedIn('screenshot', 's1')).map(c => c.id)).toEqual([first!.id]);
    expect((await reloaded.savedIn('screenshot', 's2')).map(c => c.id)).toEqual([second!.id]);
    await reloaded.deleteCollection(first!.id);
    const after = await freshStore();
    expect(await after.savedIn('screenshot', 's1')).toEqual([]);
    expect((await after.savedIn('screenshot', 's2')).map(c => c.id)).toEqual([second!.id]);
    expect(JSON.parse(backing[KEY]).map((c: { id: string }) => c.id)).toEqual([second!.id]);
  });

  it('사용 가능한 crypto가 없으면 생성하지 않고 기존 저장을 건드리지 않는다', async () => {
    const seed = JSON.stringify([{ id: 'c1', name: 'Seed', createdAt: 1, items: [] }]);
    const backing = installWindow({ seed });
    vi.stubGlobal('crypto', undefined);
    const s = await freshStore();
    await expect(s.createCollection('New')).resolves.toBeNull();
    expect(backing[KEY]).toBe(seed);
    expect(await (await freshStore()).savedIn('screenshot', 's1')).toEqual([]);
    expect(JSON.parse(backing[KEY])).toEqual([{ id: 'c1', name: 'Seed', createdAt: 1, items: [] }]);
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
    expect((await s.savedIn('screenshot', 'good')).map(c => c.id)).toEqual(['c1']);
    expect(await s.savedIn('screenshot', 'evil')).toEqual([]);
  });
});

describe('overlapping collection edits without storage events', () => {
  it.each(['add', 'remove'] as const)(
    'keeps the first %s when another tab starts an add before it commits',
    async edit => {
      const first = shot();
      const second = shot({ id: 's2', href: '/screenshots/s2' });
      let overlappingWrite: Promise<boolean> | undefined;
      let startSecondWrite: (() => void) | undefined;
      installWindow({
        seed: JSON.stringify([
          {
            id: 'c1',
            name: 'Seed',
            createdAt: 1,
            items: edit === 'remove' ? [first] : [],
          },
        ]),
        beforeWrite: () => {
          const start = startSecondWrite;
          startSecondWrite = undefined;
          start?.();
        },
      });
      const tabA = await freshStore();
      const tabB = await freshStore();
      await tabB.savedIn('screenshot', 's1');
      startSecondWrite = () => {
        overlappingWrite = tabB.addToCollection('c1', second);
      };

      if (edit === 'add') await tabA.addToCollection('c1', first);
      else await tabA.removeFromCollection('c1', 'screenshot', 's1');
      expect(await overlappingWrite).toBe(true);

      const reloaded = await freshStore();
      expect((await reloaded.savedIn('screenshot', 's1')).map(c => c.id)).toEqual(edit === 'add' ? ['c1'] : []);
      expect((await reloaded.savedIn('screenshot', 's2')).map(c => c.id)).toEqual(['c1']);
    }
  );
});

it.each(['missing', 'rejected'] as const)('preserves readable v1 data when the lock is %s', async lock => {
  const seed = JSON.stringify({
    collections: [{ id: 'c1', name: 'Seed', createdAt: 1, items: [shot()] }],
  });
  const backing = installWindow({
    seed,
    locksUnavailable: lock === 'missing',
    rejectLock: lock === 'rejected',
  });
  const store = await freshStore();

  expect((await store.savedIn('screenshot', 's1')).map(c => c.id)).toEqual(['c1']);
  await expect(store.createCollection('New')).resolves.toBeNull();
  await expect(store.deleteCollection('c1')).resolves.toBe('failed');
  await expect(store.addToCollection('c1', shot({ id: 's2' }))).resolves.toBe(false);
  await expect(store.removeFromCollection('c1', 'screenshot', 's1')).resolves.toBe(false);
  expect(backing[KEY]).toBe(seed);
  expect((await store.savedIn('screenshot', 's1')).map(c => c.id)).toEqual(['c1']);
});
