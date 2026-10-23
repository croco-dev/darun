import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { getClient } = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient }));
import { GET, HEAD } from '../app/api/markdown/[...path]/route';

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
const product = (slug: string) => ({
  id: slug,
  slug,
  name: slug === 'alpha' ? 'Alpha 도구' : 'Beta 도구',
  summary: '공개 요약',
  description: '<p>공개 본문</p>',
  updatedAt: '2026-10-01T00:00:00.000Z',
  publishedAt: '2026-09-01T00:00:00.000Z',
  tags: [],
  features: [],
  ownedCompany: slug === 'alpha' ? { name: 'Alpha Labs' } : null,
  links: [{ title: '공식 사이트', link: 'https://alpha.example/start' }],
  alternatives: [{ id: 'beta', slug: 'beta', name: 'Beta 도구', summary: '대안 요약' }],
});

function request(path: string[], sibling = false) {
  return [
    new NextRequest(`http://localhost/api/markdown/${path.join('/')}`, {
      headers: sibling ? { 'x-darun-sibling-md': '1' } : {},
    }),
    { params: Promise.resolve({ path }) },
  ] as const;
}

describe('공개 Markdown route의 실행 스키마 계약', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    getClient.mockReturnValue(
      new ApolloClient({
        cache: new InMemoryCache(),
        link: new SchemaLink({
          schema,
          validate: true,
          rootValue: {
            productBySlug: ({ slug }: { slug: string }) => {
              if (slug === 'outage') throw new Error('fixture query failure');
              return slug === 'missing' ? null : product(slug);
            },
          },
        }),
      })
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(['ko', 'en'])('상품 상세는 %s 원문과 회사·실제 링크를 제공한다', async locale => {
    const response = await GET(...request([locale, 'products', 'alpha'], true));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# Alpha 도구');
    expect(body).toContain('Alpha Labs');
    expect(body).toContain('[공식 사이트](https://alpha.example/start)');
    expect(body).not.toContain('Website:');
    expect(response.headers.get('Link')).toBe(`<https://www.darun.io/${locale}/products/alpha>; rel="canonical"`);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
  });

  it('회사 없는 상품도 정상 응답한다', async () => {
    const response = await GET(...request(['ko', 'products', 'beta']));
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('## 회사 정보');
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it.each([
    ['ko', 'products', 'alpha', 'alternatives'],
    ['en', 'compare', 'alpha', 'beta'],
  ])('%j 경로는 상품과 대안의 목적지를 보존한다', async (...path) => {
    const response = await GET(...request(path));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Alpha 도구');
    expect(body).toContain('[Beta 도구](https://www.darun.io/');
    expect(body).toContain('/products/beta)');
    if (path[1] === 'compare') expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
  });

  it.each([
    { path: ['ko', 'products', 'alpha'], status: 200 },
    { path: ['ko', 'products', 'alpha', 'alternatives'], status: 200 },
    { path: ['en', 'compare', 'alpha', 'beta'], status: 200 },
    { path: ['ko', 'products', 'missing'], status: 404 },
    { path: ['ko', 'compare', 'alpha', 'missing'], status: 404 },
    { path: ['en', 'products', 'outage'], status: 500 },
  ])('HEAD는 $path GET의 상태 $status와 헤더를 유지한다', async ({ path, status }) => {
    const get = await GET(...request(path, true));
    const head = await HEAD(...request(path, true));
    expect(get.status).toBe(status);
    expect(head.status).toBe(status);
    expect([...head.headers]).toEqual([...get.headers]);
    expect(await head.text()).toBe('');
    expect(await get.text()).not.toBe('');
  });
});
