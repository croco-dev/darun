import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Page, { generateMetadata } from '../app/[locale]/magazines/page';
import en from '../messages/en.json';
import ko from '../messages/ko.json';

const { getClient } = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient }));
vi.mock('@darun/ui-layout', () => ({ Layout: ({ children }: { children: ReactNode }) => children }));
vi.mock('next-intl/server', () => ({
  getTranslations: async ({ locale }: { locale: string }) => {
    const copy = (locale === 'en' ? en : ko).Magazine.index;
    return (key: keyof typeof copy) => copy[key];
  },
}));
vi.mock('../i18n/navigation', () => ({ Link: 'a' }));

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
const props = (locale: string) => ({ params: Promise.resolve({ locale }) });

function mockPublishedList(publishedMagazines: (args: { first: number; after?: string }) => unknown) {
  getClient.mockReturnValue(
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({
        schema,
        validate: true,
        rootValue: {
          publishedMagazines: (args: { first: number; after?: string }) => {
            const result = publishedMagazines(args);
            return Array.isArray(result)
              ? {
                  edges: result.map(node => ({ node })),
                  pageInfo: { hasNextPage: false, endCursor: null },
                }
              : result;
          },
        },
      }),
    })
  );
}

describe('public magazine index', () => {
  it.each(['ko', 'en'])('links to all published entries in %s without reading article bodies', async locale => {
    const articles = ['design%2Bnotes', '비교', 'workflow.md', 'tools'].map((slug, index) => ({
      id: String(index),
      slug,
      title: `Published article ${index}`,
      summary: index === 0 ? 'Article summary' : null,
      backgroundImageUrl: '',
      content: () => {
        throw new Error('The index must not resolve an article body');
      },
    }));
    mockPublishedList(() => articles);

    const html = renderToStaticMarkup(await Page(props(locale)));

    expect(html).toContain(`href="/${locale}/magazines/design%252Bnotes"`);
    expect(html).toContain(`href="/${locale}/magazines/%EB%B9%84%EA%B5%90"`);
    expect(html).toContain(`href="/${locale}/magazines/workflow%2Emd"`);
    expect(html).toContain(`href="/${locale}/magazines/tools"`);
    expect(html).toContain('Published article 3');
    expect(html).toContain('Article summary');
    const metadata = await generateMetadata(props(locale));
    expect(metadata.alternates?.canonical).toBe('https://www.darun.io/ko/magazines');
    expect(metadata.robots).toEqual(locale === 'en' ? { index: false, follow: true } : undefined);
  });

  it('renders uploaded covers without sending readers to other image hosts', async () => {
    const covers = [
      'https://res.cloudinary.com/demo/image/upload/cover.png',
      'https://res.cloudinary.com.example.org/tracker.png',
      '//example.org/protocol-relative.png',
      'https://res.cloudinary.com:8443/other-port.png',
      'blob:https://res.cloudinary.com/cover',
    ];
    mockPublishedList(() =>
      covers.map((backgroundImageUrl, index) => ({
        id: String(index),
        slug: `article-${index}`,
        title: `Published article ${index}`,
        summary: null,
        backgroundImageUrl,
      }))
    );

    const html = renderToStaticMarkup(await Page(props('ko')));
    expect(html).toContain(`src="${covers[0]}"`);
    for (const rejectedCover of covers.slice(1)) {
      expect(html).not.toContain(rejectedCover);
    }
    expect(html).toContain('Published article 4');
  });

  it('shows an empty state only when the public query succeeds with an empty list', async () => {
    mockPublishedList(() => []);
    const html = renderToStaticMarkup(await Page(props('en')));
    expect(html).toContain('No articles have been published yet.');
    expect(html).toContain('href="/search/product"');

    mockPublishedList(() => {
      throw new Error('List query unavailable');
    });
    await expect(Page(props('en'))).rejects.toThrow('List query unavailable');
  });
  it('한 번에 24개만 요청하고 불투명 커서로 다음 글과 최신 글 링크를 제공한다', async () => {
    const requests: { first: number; after?: string }[] = [];
    mockPublishedList(args => {
      requests.push(args);
      const next = args.after === 'opaque+/=&';
      return {
        edges: [
          {
            node: {
              id: next ? 'last' : 'first',
              slug: next ? 'last' : 'first',
              title: next ? 'Last article' : 'First article',
              summary: null,
              backgroundImageUrl: '',
            },
          },
        ],
        pageInfo: { hasNextPage: !next, endCursor: next ? null : 'opaque+/=&' },
      };
    });
    expect(renderToStaticMarkup(await Page(props('en')))).toContain('Older articles');
    const html = renderToStaticMarkup(
      await Page({
        ...props('en'),
        searchParams: Promise.resolve({ after: 'opaque+/=&' }),
      })
    );
    expect(html).toContain('Last article');
    expect(html).not.toContain('First article');
    expect(html).toContain('Back to latest articles');
    expect(html).not.toContain('Older articles');
    expect(requests).toEqual([
      { first: 24, after: null },
      { first: 24, after: 'opaque+/=&' },
    ]);
  });
});
