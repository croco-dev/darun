// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const fixture = vi.hoisted(() => ({ tier: 1, updateTier: vi.fn() }));
vi.mock('./actions', () => ({ updateTier: fixture.updateTier }));
vi.mock('@/utils/supabase/server', () => ({
  createClient: () => {
    const query = {
      select: () => query,
      order: () => query,
      range: () => query,
      overrideTypes: () => ({
        data: [{ id: 'calendar-app', name: 'Calendar', tiers: { tier: fixture.tier }, memos: null }],
        count: 1,
        error: null,
      }),
    };
    return { from: () => query };
  },
}));
vi.mock('./AppStoreScrapeForm', () => ({ AppStoreScrapeForm: () => null }));
vi.mock('./AdminSearchInput', () => ({ AdminSearchInput: () => null }));
vi.mock('@/components/admin/MemoEditor', () => ({ MemoEditor: () => null }));
vi.mock('@/components/admin/DeleteAppButton', () => ({ DeleteAppButton: () => null }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
});

async function render(tier: number) {
  fixture.tier = tier;
  const page = await AdminPage({ searchParams: Promise.resolve({}) });
  await act(async () => root.render(page));
}

const trigger = () => container.querySelector<HTMLButtonElement>('[role="combobox"]')!;

function expectTier(tier: number) {
  expect(container.querySelectorAll('tbody td')[1].textContent).toBe(tier === 0 ? 'No Tier' : `Tier ${tier}`);
  expect(trigger().textContent).toBe(tier === 0 ? '티어 없음' : `${tier}티어`);
}

async function choose(tier: number) {
  await act(async () => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  const label = tier === 0 ? '티어 없음' : `${tier}티어`;
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    item => item.textContent === label
  );
  expect(option).toBeDefined();
  await act(async () => option!.click());
}

describe('관리자 현재 티어와 선택값', () => {
  it('같은 행의 서버 티어 갱신을 표시하고 이전 티어로 한 번 변경할 수 있다', async () => {
    await render(1);
    const mountedTrigger = trigger();
    await render(2);
    expect(trigger()).toBe(mountedTrigger);
    expectTier(2);

    const request = Promise.withResolvers<void>();
    fixture.updateTier.mockReturnValueOnce(request.promise);
    await choose(1);
    expect(fixture.updateTier).toHaveBeenCalledExactlyOnceWith('calendar-app', 1);
    expect(trigger().disabled).toBe(true);
    await render(1);
    await act(async () => request.resolve());
    expectTier(1);
    expect(trigger().disabled).toBe(false);
  });

  it('저장 중 도착한 다른 서버 티어를 늦은 성공 응답이 되돌리지 않는다', async () => {
    const request = Promise.withResolvers<void>();
    fixture.updateTier.mockReturnValueOnce(request.promise);
    await render(1);
    await choose(3);
    expectTier(1);
    await render(2);
    expectTier(2);
    expect(trigger().disabled).toBe(true);
    await act(async () => request.resolve());
    expectTier(2);
    expect(trigger().disabled).toBe(false);
  });

  it('성공 직후의 서버 재검증과 티어 없음도 현재 티어 열과 일치한다', async () => {
    fixture.updateTier.mockResolvedValueOnce(undefined);
    await render(1);
    await choose(3);
    expectTier(1);
    await render(3);
    expectTier(3);
    await render(0);
    expectTier(0);
    expect(fixture.updateTier).toHaveBeenCalledExactlyOnceWith('calendar-app', 3);
  });

  it('실패하면 최신 서버 티어와 오류를 유지하고 다시 선택할 수 있다', async () => {
    const request = Promise.withResolvers<void>();
    fixture.updateTier.mockReturnValueOnce(request.promise);
    await render(1);
    await choose(3);
    await render(2);
    await act(async () => request.reject(new Error('fixture-only failure')));
    expectTier(2);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('저장하지 못했습니다');
    expect(container.textContent).not.toContain('fixture-only failure');
    expect(trigger().disabled).toBe(false);

    fixture.updateTier.mockResolvedValueOnce(undefined);
    await choose(1);
    await render(1);
    expectTier(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.updateTier.mock.calls).toEqual([
      ['calendar-app', 3],
      ['calendar-app', 1],
    ]);
  });
});
