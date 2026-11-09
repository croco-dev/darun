// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '../app/page';

const { query, refresh } = vi.hoisted(() => ({ query: vi.fn(), refresh: vi.fn() }));

vi.mock('@darun/utils-apollo-client/server', () => ({ getClient: () => ({ query }) }));
vi.mock('@darun/utils-router', async importOriginal => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ refresh }),
}));

describe('Dashboard product count', () => {
  beforeEach(() => {
    query.mockReset();
    refresh.mockReset();
  });
  afterEach(cleanup);

  it.each([0, 1234])('displays a successful count of %i', async count => {
    query.mockResolvedValue({ data: { productsCount: count } });
    render(await HomePage());

    expect(screen.getByText(`GraphQL 정상 연동 (${count.toLocaleString()}개 서비스)`)).toBeDefined();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it.each(['rejected', 'missing'] as const)('reports an unconfirmed count when the query is %s', async failure => {
    if (failure === 'rejected') query.mockRejectedValue(new Error('private database diagnostic'));
    else query.mockResolvedValue({ data: {} });
    render(await HomePage());

    expect(screen.queryByText(/정상 연동/)).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('상품 수를 확인하지 못했습니다');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeDefined();
    expect(screen.queryByText(/private database diagnostic/)).toBeNull();
    expect(screen.getByRole('link', { name: '서비스 추가' }).getAttribute('href')).toBe('/products/new');
    expect(screen.getAllByRole('link', { name: '관리 바로가기' }).map(link => link.getAttribute('href'))).toEqual([
      '/products',
      '/companies',
      '/magazines',
      '/settings/llm',
    ]);
  });

  it('refreshes the route after failure and renders the count from the new query', async () => {
    query.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ data: { productsCount: 12 } });
    const view = render(await HomePage());
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refresh).toHaveBeenCalledTimes(1);

    view.rerender(await HomePage());
    expect(query).toHaveBeenCalledTimes(2);
    expect(screen.getByText('GraphQL 정상 연동 (12개 서비스)')).toBeDefined();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });
});
