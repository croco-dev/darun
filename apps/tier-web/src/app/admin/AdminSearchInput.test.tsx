// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSearchInput } from './AdminSearchInput';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
const router = { replace: navigation.replace };
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useSearchParams: () => navigation.params,
  useRouter: () => router,
}));

let container: HTMLDivElement;
let root: Root;
const input = () => container.querySelector('input')!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  navigation.replace.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function navigate(search: string) {
  navigation.params = new URLSearchParams(search);
  await act(async () => root.render(<AdminSearchInput initialQuery={navigation.params.get('query') ?? ''} />));
}

async function type(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const debounce = () => act(async () => vi.advanceTimersByTime(300));

describe('관리자 검색어와 URL 복원', () => {
  it('뒤로·앞으로 복원한 검색어를 유지하고 URL을 다시 제출하지 않는다', async () => {
    await navigate('query=alpha');
    const mountedInput = input();
    await navigate('query=alpha&page=2');
    await type('beta');
    await debounce();
    expect(navigation.replace.mock.calls).toEqual([['/admin?query=beta']]);
    await navigate('query=beta');
    await navigate('query=alpha');
    expect(input().value).toBe('alpha');
    await navigate('query=beta');
    expect(input()).toBe(mountedInput);
    expect(input().value).toBe('beta');
    await debounce();
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it('자신이 제출한 URL이 늦게 도착해도 새로 편집 중인 입력을 보존한다', async () => {
    await navigate('query=alpha&page=2');
    await type('beta');
    await debounce();
    await type('gamma');
    await act(async () => vi.advanceTimersByTime(100));
    await navigate('query=beta');
    expect(input().value).toBe('gamma');
    await debounce();
    expect(navigation.replace.mock.calls).toEqual([['/admin?query=beta'], ['/admin?query=gamma']]);
    await navigate('query=gamma');
    expect(input().value).toBe('gamma');
    await debounce();
    expect(navigation.replace).toHaveBeenCalledTimes(2);
  });

  it('다른 URL로 복원하면 편집 중인 입력과 아직 제출하지 않은 검색을 취소한다', async () => {
    await navigate('query=alpha&page=2');
    await type('unsubmitted');
    await navigate('query=delta&page=3');
    expect(input().value).toBe('delta');
    await debounce();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('검색어를 비우면 query와 page를 제거하고 다른 조건을 보존한다', async () => {
    await navigate('query=alpha&page=2&view=compact');
    await type('   ');
    await debounce();
    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/admin?view=compact');
    await navigate('view=compact');
    await debounce();
    expect(input().value.trim()).toBe('');
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });
});
