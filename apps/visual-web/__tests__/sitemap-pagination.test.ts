import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '../app/sitemap';

const fixture = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock('../app/serverContainer', () => ({
  container: {
    get serverApolloClient() {
      return fixture.client;
    },
  },
}));

type Page = {
  edges: { node: { id: string } }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
type Request = { key: string; first: number; after?: string | null };
let requests: Request[];
let respond: (request: Request) => Page;

function catalog(count: number, key: string): string[] {
  return Array.from({ length: count }, (_, index) => `${key}-${index + 1}`);
}

function pageFor(ids: string[], { first, after }: Request): Page {
  const start = after ? Number(after) : 0;
  const end = Math.min(start + first, ids.length);
  return {
    edges: ids.slice(start, end).map(id => ({ node: { id } })),
    pageInfo: { hasNextPage: end < ids.length, endCursor: end > start ? String(end) : null },
  };
}

function expectedUrls(screenshots: number, flows: number): string[] {
  return [
    'https://visual.darun.io/',
    'https://visual.darun.io/flows',
    'https://visual.darun.io/apps',
    ...catalog(Math.min(screenshots, 100), 'shot').map(id => `https://visual.darun.io/screenshots/${id}`),
    ...catalog(Math.min(flows, 100), 'flow').map(id => `https://visual.darun.io/flows/${id}`),
  ];
}

beforeEach(() => {
  requests = [];
  fixture.client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const key = operation.operationName === 'VisualScreenshotsForSitemap' ? 'visualScreenshots' : 'visualFlows';
          const request = { key, ...operation.variables } as Request;
          requests.push(request);
          try {
            // The API rejects first > 48, rather than silently clamping it.
            if (!Number.isInteger(request.first) || request.first < 1 || request.first > 48) {
              throw new Error('pagination/invalid-connection-args');
            }
            observer.next({ data: { [key]: respond(request) } });
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        })
    ),
  });
});

describe('visual sitemap through Apollo with the API pagination limit', () => {
  it.each([0, 1, 48, 49, 100, 137])('collects up to 100 unique URLs from %i records per catalog', async count => {
    respond = request => pageFor(catalog(count, request.key === 'visualScreenshots' ? 'shot' : 'flow'), request);
    expect((await sitemap()).map(entry => entry.url)).toEqual(expectedUrls(count, count));
    expect(requests.every(request => request.first <= 48)).toBe(true);
    if (count > 48) {
      expect(requests.filter(request => request.key === 'visualScreenshots').map(request => request.after)).toEqual(
        count > 96 ? [undefined, '48', '96'] : [undefined, '48']
      );
    }
  });

  it('paginates screenshots and flows independently', async () => {
    respond = request =>
      pageFor(
        catalog(request.key === 'visualScreenshots' ? 49 : 100, request.key === 'visualScreenshots' ? 'shot' : 'flow'),
        request
      );
    expect((await sitemap()).map(entry => entry.url)).toEqual(expectedUrls(49, 100));
  });

  it('keeps one URL per ID when adjacent pages overlap', async () => {
    respond = request =>
      request.after
        ? {
            edges: [{ node: { id: 'shared' } }, { node: { id: 'last' } }],
            pageInfo: { hasNextPage: false, endCursor: 'next' },
          }
        : {
            edges: [{ node: { id: 'first' } }, { node: { id: 'shared' } }],
            pageInfo: { hasNextPage: true, endCursor: 'next' },
          };
    const urls = (await sitemap()).map(entry => entry.url);
    expect(urls.slice(3)).toEqual([
      'https://visual.darun.io/screenshots/first',
      'https://visual.darun.io/screenshots/shared',
      'https://visual.darun.io/screenshots/last',
      'https://visual.darun.io/flows/first',
      'https://visual.darun.io/flows/shared',
      'https://visual.darun.io/flows/last',
    ]);
  });

  it.each(['unchanged', 'cycle', 'missing', 'empty page'])(
    'rejects a %s continuation cursor instead of caching a partial sitemap',
    async mode => {
      respond = request => ({
        edges: mode === 'empty page' ? [] : [{ node: { id: `id-${request.after ?? 'start'}` } }],
        pageInfo: {
          hasNextPage: true,
          endCursor:
            mode === 'missing'
              ? null
              : mode === 'cycle' && request.after === 'second'
                ? 'first'
                : request.after
                  ? mode === 'cycle'
                    ? 'second'
                    : 'first'
                  : 'first',
        },
      });
      await expect(sitemap()).rejects.toThrow();
      expect(requests.length).toBeLessThanOrEqual(6);
    }
  );

  it('rejects an API outage and returns detail URLs on the next successful request', async () => {
    respond = () => {
      throw new Error('Fixture API unavailable');
    };
    await expect(sitemap()).rejects.toThrow('Fixture API unavailable');
    respond = request => pageFor(catalog(49, request.key === 'visualScreenshots' ? 'shot' : 'flow'), request);
    expect((await sitemap()).map(entry => entry.url)).toEqual(expectedUrls(49, 49));
  });

  it('rejects a response missing its connection metadata', async () => {
    respond = () => ({ edges: [] }) as unknown as Page;
    await expect(sitemap()).rejects.toThrow();
  });
});
