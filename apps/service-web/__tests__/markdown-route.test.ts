import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { getRouteMatcher } from 'next/dist/shared/lib/router/utils/route-matcher';
import { getRouteRegex } from 'next/dist/shared/lib/router/utils/route-regex';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { getClient } = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient }));
vi.mock('next-intl/middleware', () => ({ default: () => vi.fn() }));
import { GET, HEAD } from '../app/api/markdown/[...path]/route';
import middleware from '../middleware';

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
const matchMarkdownRoute = getRouteMatcher(getRouteRegex('/api/markdown/[...path]'));
const magazineSlugs = [
  ['design', 'design'],
  ['한글', '%ED%95%9C%EA%B8%80'],
  ['c%2B%2B', 'c%252B%252B'],
  ['design#tools', 'design%23tools'],
  ['design?tools', 'design%3Ftools'],
  ['design/tools', 'design%2Ftools'],
] as const;
let failRelations = false;
const fieldReads: string[] = [];
function readField<T>(slug: string, field: string, value: T): T {
  fieldReads.push(`${slug}.${field}`);
  if (failRelations) throw new Error(`fixture ${field} failure`);
  return value;
}

const product = (slug: string) => ({
  id: slug,
  slug,
  name: slug === 'alpha' ? 'Alpha 도구' : 'Beta 도구',
  summary: `${slug} 공개 요약`,
  description: `<p>${slug} 공개 본문</p>`,
  updatedAt: '2026-10-01T00:00:00.000Z',
  publishedAt: '2026-09-01T00:00:00.000Z',
  tags: () => readField(slug, 'tags', [{ name: '태그' }]),
  features: () => readField(slug, 'features', [{ name: '기능', emoji: '📋', summary: '기능 요약' }]),
  ownedCompany: () => readField(slug, 'ownedCompany', slug === 'alpha' ? { name: 'Alpha Labs' } : null),
  links: () => readField(slug, 'links', [{ title: '공식 사이트', link: 'https://alpha.example/start' }]),
  alternatives: () => {
    fieldReads.push(`${slug}.alternatives`);
    return slug === 'empty' ? [] : [{ id: 'beta', slug: 'beta', name: 'Beta 도구', summary: '대안 요약' }];
  },
});

function request(path: string[], sibling = false) {
  return [
    new NextRequest(`http://localhost/api/markdown/${path.join('/')}`, {
      headers: sibling ? { 'x-darun-sibling-md': '1' } : {},
    }),
    { params: Promise.resolve({ path }) },
  ] as const;
}

function magazineRequest(locale: string, segment: string, method: 'GET' | 'HEAD', sibling: boolean) {
  const request = new NextRequest(`http://localhost/${locale}/magazines/${segment}${sibling ? '.md' : ''}`, {
    method,
    headers: { Accept: sibling ? '*/*' : 'text/markdown' },
  });
  const rewrite = middleware(request);
  const pathname = new URL(rewrite.headers.get('x-middleware-rewrite')!).pathname;
  const params = matchMarkdownRoute(pathname);
  if (!params || !Array.isArray(params.path)) throw new Error(`No Markdown route for ${pathname}`);
  if (rewrite.headers.get('x-middleware-request-x-darun-sibling-md') === '1') {
    request.headers.set('x-darun-sibling-md', '1');
  }
  return {
    request,
    context: { params: Promise.resolve({ path: params.path }) },
  };
}

describe('공개 Markdown route의 실행 스키마 계약', () => {
  beforeEach(() => {
    failRelations = false;
    fieldReads.length = 0;
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
            magazineBySlug: ({ slug }: { slug: string }) => {
              if (slug === 'outage') throw new Error('fixture magazine query failure');
              if (!magazineSlugs.some(([storedSlug]) => storedSlug === slug)) return null;
              return {
                id: slug,
                slug,
                title: '공개 매거진',
                content: `<p>본문: ${slug}</p>`,
              };
            },
          },
        }),
      })
    );
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(['ko', 'en'])('%s 매거진 Markdown', locale => {
    it.each(magazineSlugs)('저장 slug %s의 원문과 한국어 canonical을 제공한다', async (slug, segment) => {
      const canonical = `https://www.darun.io/ko/magazines/${segment}`;
      const sibling = magazineRequest(locale, segment, 'GET', true);
      const accept = magazineRequest(locale, segment, 'GET', false);
      const siblingResponse = await GET(sibling.request, sibling.context);
      const acceptResponse = await GET(accept.request, accept.context);

      expect(siblingResponse.status).toBe(200);
      expect(acceptResponse.status).toBe(200);
      const body = await siblingResponse.text();
      expect(body).toContain(`Canonical URL: ${canonical}\n`);
      expect(body).toContain(`본문: ${slug}`);
      expect(await acceptResponse.text()).toBe(body);
      expect(siblingResponse.headers.get('Link')).toBe(`<${canonical}>; rel="canonical"`);
      expect(siblingResponse.headers.get('X-Robots-Tag')).toBe('noindex, follow');
      expect(acceptResponse.headers.get('X-Robots-Tag')).toBe(locale === 'en' ? 'noindex, follow' : null);
    });

    it.each([
      ['design%23tools', 200],
      ['missing', 404],
      ['outage', 500],
    ])('%s GET과 HEAD의 상태 %i 및 헤더가 일치한다', async (segment, status) => {
      for (const sibling of [false, true]) {
        const get = magazineRequest(locale, segment, 'GET', sibling);
        const head = magazineRequest(locale, segment, 'HEAD', sibling);
        const getResponse = await GET(get.request, get.context);
        const headResponse = await HEAD(head.request, head.context);
        expect(getResponse.status).toBe(status);
        expect(headResponse.status).toBe(status);
        expect([...headResponse.headers]).toEqual([...getResponse.headers]);
        expect(await headResponse.text()).toBe('');
      }
    });
  });

  it.each(['ko', 'en'])('상품 상세는 %s 원문과 회사·실제 링크를 제공한다', async locale => {
    const response = await GET(...request([locale, 'products', 'alpha'], true));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('# Alpha 도구');
    expect(body).toContain('Alpha Labs');
    expect(body).toContain('태그');
    expect(body).toContain('기능 요약');
    expect(body).toContain('alpha 공개 본문');
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

  describe.each(['ko', 'en'])('%s 표현별 조회 범위', locale => {
    it.each([false, true])('대안은 필요한 관계만 조회한다 (미사용 관계 실패=%s)', async fail => {
      failRelations = fail;
      const response = await GET(...request([locale, 'products', 'alpha', 'alternatives'], true));
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain('Alpha 도구');
      expect(body).toContain(`[Beta 도구](https://www.darun.io/${locale}/products/beta) — 대안 요약`);
      expect(body).not.toContain('alpha 공개 본문');
      expect(fieldReads).toEqual(['alpha.alternatives']);
      const head = await HEAD(...request([locale, 'products', 'alpha', 'alternatives'], true));
      expect(head.status).toBe(200);
      expect([...head.headers]).toEqual([...response.headers]);
      expect(await head.text()).toBe('');
      expect(response.headers.get('Link')).toBe(
        `<https://www.darun.io/${locale}/products/alpha/alternatives>; rel="canonical"`
      );
    });

    it.each([false, true])('비교는 두 상품 본문을 관계 조회 없이 제공한다 (관계 실패=%s)', async fail => {
      failRelations = fail;
      const response = await GET(...request([locale, 'compare', 'alpha', 'beta']));
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain('alpha 공개 요약');
      expect(body).toContain('beta 공개 요약');
      expect(body).toContain('alpha 공개 본문');
      expect(body).toContain('beta 공개 본문');
      expect(fieldReads).toEqual([]);
      const head = await HEAD(...request([locale, 'compare', 'alpha', 'beta']));
      expect(head.status).toBe(200);
      expect([...head.headers]).toEqual([...response.headers]);
      expect(await head.text()).toBe('');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
    });

    it('대안이 없으면 GET과 HEAD 모두 noindex를 유지한다', async () => {
      const path = [locale, 'products', 'empty', 'alternatives'];
      const get = await GET(...request(path));
      const head = await HEAD(...request(path));
      expect(get.status).toBe(200);
      expect(head.status).toBe(200);
      expect([...head.headers]).toEqual([...get.headers]);
      expect(get.headers.get('X-Robots-Tag')).toBe('noindex, follow');
      expect(await get.text()).toContain(
        locale === 'ko' ? '등록된 대안 서비스가 없습니다.' : 'No alternatives available.'
      );
      expect(await head.text()).toBe('');
    });

    it('상세가 사용하는 관계의 실패는 오류로 유지한다', async () => {
      failRelations = true;
      const response = await GET(...request([locale, 'products', 'alpha']));
      expect(response.status).toBe(500);
      expect(fieldReads).toContain('alpha.tags');
    });

    it.each([
      { suffix: ['products', 'missing', 'alternatives'], status: 404 },
      { suffix: ['products', 'outage', 'alternatives'], status: 500 },
      { suffix: ['compare', 'alpha', 'missing'], status: 404 },
      { suffix: ['compare', 'outage', 'beta'], status: 500 },
    ])('필수 상품 조회의 $status 상태를 HEAD에서도 유지한다: $suffix', async ({ suffix, status }) => {
      const get = await GET(...request([locale, ...suffix], true));
      const head = await HEAD(...request([locale, ...suffix], true));
      expect(get.status).toBe(status);
      expect(head.status).toBe(status);
      expect([...head.headers]).toEqual([...get.headers]);
      expect(await head.text()).toBe('');
    });
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
