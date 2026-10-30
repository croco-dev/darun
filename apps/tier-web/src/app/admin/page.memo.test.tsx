// @vitest-environment jsdom
import { MemoEditor } from '@/components/admin/MemoEditor';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const { updateAppMemo, toast } = vi.hoisted(() => ({ updateAppMemo: vi.fn(), toast: vi.fn() }));

vi.mock('./actions', () => ({ updateAppMemo }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => {
    const query = {
      select: () => query,
      ilike: () => query,
      order: () => query,
      range: () => query,
      overrideTypes: () => ({
        data: [
          { id: 'first-app', name: 'First app', tiers: null, memos: { content: 'First saved memo' } },
          { id: 'second-app', name: 'Second app', tiers: null, memos: { content: 'Second saved memo' } },
        ],
        count: 30,
        error: null,
      }),
    };
    return { from: () => query };
  },
}));
vi.mock('./AppStoreScrapeForm', () => ({ AppStoreScrapeForm: () => null }));
vi.mock('./AdminSearchInput', () => ({ AdminSearchInput: () => null }));
vi.mock('./TierSelect', () => ({ TierSelect: () => null }));
vi.mock('@/components/admin/DeleteAppButton', () => ({ DeleteAppButton: () => null }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/admin?query=app&page=2');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function editMemo(input: HTMLTextAreaElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('admin memo save navigation', () => {
  it('runs only the memo action even when composed inside a form', async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    await act(async () => {
      root.render(
        <form onSubmit={submit}>
          <MemoEditor appId="first-app" initialContent="Saved memo" />
        </form>
      );
    });
    await editMemo(container.querySelector('textarea')!, 'Changed memo');
    await act(async () => container.querySelector('button')!.click());

    expect(updateAppMemo).toHaveBeenCalledExactlyOnceWith('first-app', 'Changed memo');
    expect(submit).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'] as const)('keeps every draft and the URL through a delayed %s', async outcome => {
    const request = Promise.withResolvers<void>();
    updateAppMemo.mockReturnValueOnce(request.promise);
    const submit = vi.fn((event: Event) => event.preventDefault());
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    container.addEventListener('submit', submit);
    const page = await AdminPage({ searchParams: Promise.resolve({ query: 'app', page: '2' }) });
    await act(async () => root.render(page));
    const [first, second] = container.querySelectorAll('textarea');
    const save = container.querySelector<HTMLButtonElement>('tbody tr button')!;
    await editMemo(first, 'First unsaved draft');
    await editMemo(second, 'Second unsaved draft');

    await act(async () => save.click());
    expect(updateAppMemo).toHaveBeenCalledExactlyOnceWith('first-app', 'First unsaved draft');
    expect(submit).not.toHaveBeenCalled();
    expect(save.disabled).toBe(true);
    expect(toast).not.toHaveBeenCalled();
    expect(first.value).toBe('First unsaved draft');
    expect(second.value).toBe('Second unsaved draft');
    expect(window.location.pathname + window.location.search).toBe('/admin?query=app&page=2');

    await act(async () => {
      if (outcome === 'success') request.resolve();
      else request.reject(new Error('Fixture save failure'));
    });

    expect(save.disabled).toBe(false);
    expect(first.value).toBe('First unsaved draft');
    expect(second.value).toBe('Second unsaved draft');
    expect(window.location.pathname + window.location.search).toBe('/admin?query=app&page=2');
    expect(submit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledExactlyOnceWith(
      outcome === 'success'
        ? { title: '메모 저장 성공', description: '앱 메모가 업데이트되었습니다.' }
        : {
            title: '메모 저장 실패',
            description: '메모를 저장하는 중 오류가 발생했습니다.',
            variant: 'destructive',
          }
    );
    expect(consoleError).toHaveBeenCalledTimes(outcome === 'failure' ? 1 : 0);
  });
});
