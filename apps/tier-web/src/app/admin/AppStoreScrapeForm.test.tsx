// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppStoreSearchState } from './actions';
import { AppStoreScrapeForm } from './AppStoreScrapeForm';

const { searchAndAddApps } = vi.hoisted(() => ({ searchAndAddApps: vi.fn() }));
vi.mock('./actions', () => ({ searchAndAddApps }));
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<AppStoreScrapeForm />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('preserves the keyword after rejection and clears it only after a successful retry', async () => {
  const input = container.querySelector('input')!;
  const button = container.querySelector('button')!;
  const pending = Promise.withResolvers<AppStoreSearchState>();
  searchAndAddApps.mockReturnValueOnce(pending.promise);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '생산성 앱');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => button.click());
  expect(input.disabled).toBe(true);
  expect(button.disabled).toBe(true);
  expect(input.value).toBe('생산성 앱');
  expect(searchAndAddApps.mock.calls[0][1].get('keyword')).toBe('생산성 앱');
  await act(async () => pending.resolve({ status: 'error', message: '잠시 후 다시 시도해 주세요.' }));
  expect(input.disabled).toBe(false);
  expect(button.disabled).toBe(false);
  expect(input.value).toBe('생산성 앱');
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('다시 시도');
  expect(container.querySelector('output')).toBeNull();
  searchAndAddApps.mockResolvedValueOnce({
    status: 'success',
    message: '1개 검색, 0개 추가했습니다.',
    searched: 1,
    added: 0,
  });
  await act(async () => button.click());
  expect(searchAndAddApps.mock.calls[1][1].get('keyword')).toBe('생산성 앱');
  expect(input.value).toBe('');
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector('output')?.textContent).toContain('0개 추가');
});
