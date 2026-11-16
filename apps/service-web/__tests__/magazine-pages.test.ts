import { describe, expect, it, vi } from 'vitest';
import { collectMagazinePages } from '../lib/magazines/collect-pages';

describe('매거진 전 페이지 수집', () => {
  it('250개가 넘는 글을 마지막까지 수집하고 중간 실패를 부분 성공으로 바꾸지 않는다', async () => {
    const articles = Array.from({ length: 257 }, (_, id) => ({ id }));
    const fetch = vi.fn(async (after?: string) => {
      const start = Number(after ?? 0);
      return {
        edges: articles.slice(start, start + 100).map(node => ({ node })),
        pageInfo: {
          hasNextPage: start + 100 < articles.length,
          endCursor: String(start + 100),
        },
      };
    });
    expect(await collectMagazinePages(fetch)).toEqual(articles);
    expect(fetch.mock.calls).toEqual([[undefined], ['100'], ['200']]);
    fetch.mockImplementation(async after => {
      if (after) throw new Error('middle page unavailable');
      return {
        edges: [{ node: articles[0] }],
        pageInfo: { hasNextPage: true, endCursor: '100' },
      };
    });
    await expect(collectMagazinePages(fetch)).rejects.toThrow('middle page unavailable');
  });

  it.each([
    { edges: [{ node: 1 }], pageInfo: { hasNextPage: true, endCursor: null } },
    { edges: [], pageInfo: { hasNextPage: true, endCursor: 'cursor' } },
    {
      edges: [{ node: 1 }],
      pageInfo: { hasNextPage: true, endCursor: 'cursor' },
    },
  ])('잘못된 페이지 진행을 성공으로 숨기지 않는다', async page => {
    await expect(collectMagazinePages(async () => page)).rejects.toThrow('did not advance');
  });
});
