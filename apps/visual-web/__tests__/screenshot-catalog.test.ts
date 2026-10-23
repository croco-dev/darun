import type { ApolloClient } from '@apollo/client';
import { describe, expect, it, vi } from 'vitest';
import { loadScreenshotCatalog } from '../features/screenshots/useScreenshotCatalog';

function page(hasNextPage = true, endCursor: string | null = 'app-24') {
  return {
    data: {
      visualApps: {
        totalCount: 100000,
        edges: [
          {
            node: {
              id: 'app-a',
              name: '같은 이름',
              slug: 'app-a',
              summary: '',
              logoUrl: '',
              coverScreenshot: {
                id: 'cover-a',
                imageUrl: '/a.png',
                imageAlt: 'A',
                title: null,
                platform: null,
                screenType: null,
              },
            },
          },
        ],
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

describe('bounded app catalog', () => {
  it('returns first useful cover without requesting later pages and retains complete server count', async () => {
    const query = vi.fn().mockResolvedValue(page());
    const result = await loadScreenshotCatalog({ query } as unknown as ApolloClient);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].variables).toEqual({ first: 24, after: null, query: null, productSlug: null });
    expect(result.cards.map(card => card.id)).toEqual(['cover-a']);
    expect(result.totalCount).toBe(100000);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });

  it('requests only the selected page with all server filters and propagates failure for retry', async () => {
    const query = vi.fn().mockRejectedValue(new Error('Page unavailable'));
    await expect(
      loadScreenshotCatalog({ query } as unknown as ApolloClient, 'app-24', '검색', 'app-a')
    ).rejects.toThrow('Page unavailable');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].variables).toEqual({
      first: 24,
      after: 'app-24',
      query: '검색',
      productSlug: 'app-a',
    });
  });

  it('rejects a repeated next cursor rather than offering endless navigation', async () => {
    const query = vi.fn().mockResolvedValue(page(true, 'same'));
    await expect(loadScreenshotCatalog({ query } as unknown as ApolloClient, 'same')).rejects.toThrow(
      'App catalog cursor did not advance'
    );
  });
});
