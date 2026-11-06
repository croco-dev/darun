import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { buildSchema, execute } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
              screenshotCount: 1000,
              previewScreenshots: ['a', 'b', 'c'].map(id => ({
                id: `preview-${id}`,
                imageUrl: `/${id}.png`,
                imageAlt: id,
                title: null,
                platform: null,
                screenType: null,
              })),
            },
          },
        ],
        pageInfo: { hasNextPage, endCursor },
      },
    },
  };
}

describe('bounded app catalog', () => {
  it('returns three previews without requesting later pages and retains full app and screen counts', async () => {
    const query = vi.fn().mockResolvedValue(page());
    const result = await loadScreenshotCatalog({ query } as unknown as ApolloClient);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].variables).toEqual({ first: 24, after: null, query: null, productSlug: null });
    expect(result.cards.map(card => card.id)).toEqual(['preview-a', 'preview-b', 'preview-c']);
    expect(result.cards[0].product.screenshotCount).toBe(1000);
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

// Execute the generated catalog operation against the stored server schema.
// Resolvers at the repository boundary count only fields GraphQL actually selects.
function catalogServer(failure?: 'cover' | 'preview') {
  const cover = vi.fn(() => {
    if (failure === 'cover') throw new Error('Cover unavailable');
    return null;
  });
  const previews = vi.fn((count: number, appId: string) => {
    if (failure === 'preview') throw new Error('Previews unavailable');
    return Array.from({ length: count }, (_, index) => ({
      id: `${appId}-${index}`,
      imageUrl: `/${appId}-${index}.png`,
      imageAlt: `${appId} preview ${index}`,
      title: null,
      platform: null,
      screenType: null,
    }));
  });
  const visualApps = vi.fn(({ after }: { after?: string }) => ({
    totalCount: 4,
    edges: (after ? [1] : [0, 1, 3]).map((count, index) => {
      const id = after ? 'last-app' : `app-${index}`;
      return {
        node: {
          id,
          name: id,
          slug: id,
          summary: 'summary',
          logoUrl: '/logo.png',
          screenshotCount: count + 10,
          previewScreenshots: () => previews(count, id),
          coverScreenshot: cover,
        },
      };
    }),
    pageInfo: { hasNextPage: !after, endCursor: after ? 'last' : 'next' },
  }));
  const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          Promise.resolve(
            execute({
              schema,
              document: operation.query,
              variableValues: operation.variables,
              rootValue: { visualApps },
            })
          ).then(
            result => {
              observer.next(result);
              observer.complete();
            },
            error => observer.error(error)
          );
        })
    ),
  });
  return { client, cover, previews, visualApps };
}

describe('catalog operation and Apollo integration', () => {
  it('0/1/3장 preview와 앱 순서·건수·다음 페이지를 보존하며 cover resolver를 호출하지 않는다', async () => {
    const server = catalogServer();
    try {
      const first = await loadScreenshotCatalog(server.client, null, '검색', 'selected');
      expect(first.apps.map(app => app.id)).toEqual(['app-0', 'app-1', 'app-2']);
      expect(first.cards.map(card => card.id)).toEqual(['app-1-0', 'app-2-0', 'app-2-1', 'app-2-2']);
      expect(first.apps.map(app => app.screenshotCount)).toEqual([10, 11, 13]);
      expect(first.totalCount).toBe(4);
      expect(first.pageInfo).toMatchObject({
        hasNextPage: true,
        endCursor: 'next',
      });
      const second = await loadScreenshotCatalog(server.client, first.pageInfo.endCursor, '검색', 'selected');
      expect(second.apps.map(app => app.id)).toEqual(['last-app']);
      expect(second.cards.map(card => card.id)).toEqual(['last-app-0']);
      expect(second.pageInfo).toMatchObject({
        hasNextPage: false,
        endCursor: 'last',
      });
      expect(server.visualApps.mock.calls.map(([args]) => args)).toEqual([
        { first: 24, after: null, query: '검색', productSlug: 'selected' },
        { first: 24, after: 'next', query: '검색', productSlug: 'selected' },
      ]);
      expect(server.previews).toHaveBeenCalledTimes(4);
      expect(server.cover).not.toHaveBeenCalled();
    } finally {
      server.client.stop();
    }
  });

  it('미사용 cover의 장애가 정상 preview 목록을 실패시키지 않는다', async () => {
    const server = catalogServer('cover');
    try {
      const result = await loadScreenshotCatalog(server.client);
      expect(result.apps).toHaveLength(3);
      expect(result.cards).toHaveLength(4);
      expect(server.cover).not.toHaveBeenCalled();
    } finally {
      server.client.stop();
    }
  });

  it('실제 preview 조회 오류는 정상 빈 목록으로 바꾸지 않고 전파한다', async () => {
    const server = catalogServer('preview');
    try {
      await expect(loadScreenshotCatalog(server.client)).rejects.toThrow('Previews unavailable');
    } finally {
      server.client.stop();
    }
  });
});
