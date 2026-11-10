// @vitest-environment jsdom
import type { User } from '@supabase/supabase-js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock('@/app/login/actions', () => ({ logout }));
vi.mock('next/navigation', () => ({ usePathname: () => '/apps' }));

const user = { id: 'reader', email: 'reader@example.invalid' } as User;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function trigger() {
  return container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
}

async function selectLogout() {
  await act(async () => {
    trigger().focus();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    element => element.textContent === '로그아웃'
  )!;
  expect(item).toBeDefined();
  await act(async () => {
    item.click();
    item.click();
  });
}

describe('account menu logout recovery', () => {
  it.each(['result', 'rejection'])(
    'shows a persistent closed-menu error after %s and guards a delayed retry',
    async failure => {
      if (failure === 'result') logout.mockResolvedValueOnce({ error: '로그아웃하지 못했습니다.' });
      else logout.mockRejectedValueOnce(new Error('private transport failure'));
      await act(async () => root.render(<UserMenu user={user} isAdmin={false} />));
      await selectLogout();

      expect(logout).toHaveBeenCalledTimes(1);
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      const alert = container.querySelector<HTMLElement>('[role="alert"]')!;
      expect(alert.textContent).toContain('로그아웃하지 못했습니다.');
      expect(alert.textContent).not.toContain('private');
      expect(trigger().disabled).toBe(false);

      let finish!: (_result: { error: string }) => void;
      logout.mockReturnValueOnce(new Promise(resolve => (finish = resolve)));
      const retry = alert.querySelector('button')!;
      await act(async () => {
        retry.click();
        retry.click();
      });
      expect(logout).toHaveBeenCalledTimes(2);
      expect(trigger().disabled).toBe(true);
      expect(container.querySelector('output')?.textContent).toBe('로그아웃 중…');
      expect(container.querySelector('[role="alert"]')).toBeNull();
      await act(async () => finish({ error: '다시 시도해 주세요.' }));
      expect(trigger().disabled).toBe(false);
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('다시 시도해 주세요.');

      logout.mockResolvedValueOnce({});
      await act(async () => container.querySelector<HTMLButtonElement>('[role="alert"] button')!.click());
      expect(logout).toHaveBeenCalledTimes(3);
      expect(container.querySelector('[role="alert"]')).toBeNull();
    }
  );

  it('blocks repeated menu selections during the first delayed request', async () => {
    let finish!: (_result: { error: string }) => void;
    logout.mockReturnValue(new Promise(resolve => (finish = resolve)));
    await act(async () => root.render(<UserMenu user={user} isAdmin />));
    await selectLogout();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(trigger().disabled).toBe(true);
    await act(async () => trigger().click());
    expect(logout).toHaveBeenCalledTimes(1);
    await act(async () => finish({ error: '로그아웃하지 못했습니다.' }));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('keeps the signed-out login link without a logout action', async () => {
    await act(async () => root.render(<UserMenu user={null} isAdmin={false} />));
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/auth/signin');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });
});
