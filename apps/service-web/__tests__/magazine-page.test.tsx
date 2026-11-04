import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { getClient } = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient }));
vi.mock('@darun/pages-shell', () => ({
  MagazineContentPage: ({ params, title }: { params: { slug: string }; title: string }) => (
    <main data-slug={params.slug}>{title}</main>
  ),
}));
vi.mock('@darun/utils-router', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
import Page, { generateMetadata } from '../app/[locale]/magazines/[slug]/page';

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
const storedSlugs = ['stored', 'c%2B%2B', '한글', 'design/tools'];
const magazine = {
  title: 'An established title',
  summary: 'The original summary',
  backgroundImageUrl: 'https://example.com/cover.png',
  publishedAt: '2026-10-01T03:00:00Z',
  updatedAt: '2026-10-02T03:00:00Z',
  author: { name: 'Ada' },
};
const props = (slug: string, locale = 'ko') => ({
  params: Promise.resolve({ slug, locale }),
});

beforeEach(() => {
  getClient.mockReturnValue(
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({
        schema,
        validate: true,
        rootValue: {
          magazineBySlug: ({ slug }: { slug: string }) => {
            if (slug === 'outage') throw new Error('fixture query unavailable');
            return storedSlugs.includes(slug) ? magazine : null;
          },
        },
      }),
    })
  );
});

describe('magazine route and metadata', () => {
  it.each(['ko', 'en'])(
    'preserves %s title, author, dates and canonical independently of body rendering',
    async locale => {
      const metadata = await generateMetadata(props('stored', locale));
      expect(metadata.title).toContain('An established title');
      expect(metadata.description).toBe('The original summary');
      expect(metadata.authors).toEqual([{ name: 'Ada' }]);
      expect(metadata.alternates?.canonical).toBe('https://www.darun.io/ko/magazines/stored');
      expect(metadata.openGraph?.images).toEqual([
        {
          url: magazine.backgroundImageUrl,
          width: 1200,
          height: 630,
          alt: magazine.title,
        },
      ]);
      expect(metadata.robots).toEqual(locale === 'en' ? { index: false, follow: true } : undefined);
      const html = renderToStaticMarkup(await Page(props('stored', locale)));
      expect(html).toContain('"datePublished":"2026-10-01T03:00:00Z"');
      expect(html).toContain('"dateModified":"2026-10-02T03:00:00Z"');
      expect(html).toContain('"name":"Ada"');
    }
  );

  it.each([
    ['c%2B%2B', 'c%252B%252B'],
    ['한글', '%ED%95%9C%EA%B8%80'],
    ['design/tools', 'design%2Ftools'],
  ])('uses stored slug %s for the HTML body and metadata', async (slug, segment) => {
    const metadata = await generateMetadata(props(slug, 'en'));
    const canonical = `https://www.darun.io/ko/magazines/${segment}`;
    expect(metadata.alternates?.canonical).toBe(canonical);

    const html = renderToStaticMarkup(await Page(props(segment, 'en')));
    expect(html).toContain(`data-slug="${slug}"`);
    expect(html).toContain(`"mainEntityOfPage":"${canonical}"`);
  });

  it('routes a missing magazine to not-found rather than the empty-body page', async () => {
    await expect(Page(props('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(generateMetadata(props('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('propagates a query failure to the existing error boundary', async () => {
    await expect(Page(props('outage'))).rejects.toThrow('fixture query unavailable');
    await expect(generateMetadata(props('outage'))).rejects.toThrow('fixture query unavailable');
  });
});
