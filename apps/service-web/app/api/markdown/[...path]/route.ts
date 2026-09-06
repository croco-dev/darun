import { gql } from '@apollo/client';
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '../../../../app/getServerClient';
import { appendVary } from '../../../../lib/seo/accept';
import {
  buildCategoryMarkdown,
  buildCompareMarkdown,
  buildHomeMarkdown,
  buildMagazineMarkdown,
  buildNotFoundMarkdown,
  buildProductAlternativesMarkdown,
  buildProductMarkdown,
  buildRankingMarkdown,
} from '../../../../lib/seo/markdown-builder';
import { absolutePublicUrl, isPublicLocale, normalizeLocale, PublicLocale } from '../../../../lib/seo/url';

export const revalidate = 3600; // 1 hour

const PRODUCT_QUERY = gql`
  query ProductOnMarkdown($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      name
      slug
      summary
      description
      updatedAt
      publishedAt
      tags {
        name
      }
      features {
        name
        emoji
        summary
      }
      company {
        name
        websiteUrl
      }
      links {
        title
        url
      }
      alternatives {
        id
        name
        slug
        summary
      }
    }
  }
`;

const CATEGORIES_QUERY = gql`
  query CategoriesOnMarkdown($first: Int!, $locale: String!) {
    categories(first: $first, locale: $locale) {
      id
      slug
      labelKo
      labelEn
    }
  }
`;

const PRODUCTS_BY_CATEGORY_QUERY = gql`
  query ProductsByCategoryOnMarkdown($slug: String!, $locale: String!) {
    productsByCategory(slug: $slug, locale: $locale) {
      id
      name
      slug
      summary
    }
  }
`;

const RANKED_PRODUCTS_QUERY = gql`
  query RankedProductsOnMarkdown($first: Int!, $locale: String!) {
    rankedProducts(first: $first, locale: $locale) {
      id
      name
      slug
      summary
      voteCount
    }
  }
`;

const MAGAZINE_QUERY = gql`
  query MagazineOnMarkdown($slug: String!) {
    magazineBySlug(slug: $slug) {
      id
      title
      slug
      content
      publishedAt
      updatedAt
      author {
        name
      }
    }
  }
`;

type RouteParams = {
  params: Promise<{ path?: string[] }>;
};

type ProductQueryResult = {
  id: string;
  name: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  tags?: Array<{ name: string }>;
  features?: Array<{ name: string; emoji?: string | null; summary?: string | null }>;
  company?: { name: string; websiteUrl?: string | null } | null;
  links?: Array<{ title?: string | null; url: string }>;
  alternatives?: Array<{ id: string; name: string; slug: string; summary?: string | null }>;
};

type MagazineQueryResult = {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  author?: { name: string } | null;
};

export async function GET(req: NextRequest, props: RouteParams): Promise<NextResponse> {
  return handleMarkdownRequest(req, props, false);
}

export async function HEAD(req: NextRequest, props: RouteParams): Promise<NextResponse> {
  return handleMarkdownRequest(req, props, true);
}

async function handleMarkdownRequest(req: NextRequest, props: RouteParams, isHead: boolean): Promise<NextResponse> {
  const { path = [] } = await props.params;

  // First segment is locale
  const rawLocale = path[0];
  const locale: PublicLocale = isPublicLocale(rawLocale ?? '') ? normalizeLocale(rawLocale) : 'ko';
  const subPath = isPublicLocale(rawLocale ?? '') ? path.slice(1) : path;

  const isSiblingMd = req.headers.get('x-darun-sibling-md') === '1';
  const canonicalPathname = isPublicLocale(rawLocale ?? '') ? `/${subPath.join('/')}` : `/${path.join('/')}`;

  const canonicalUrl = absolutePublicUrl(locale, canonicalPathname);

  const client = getClient({ static: true });

  const createResponse = (body: string, status = 200, options: { noindex?: boolean } = {}) => {
    const headers = new Headers();
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
    headers.set('Vary', appendVary(req.headers.get('Vary'), 'Accept'));

    if (isSiblingMd || options.noindex || status === 404) {
      headers.set('X-Robots-Tag', 'noindex, follow');
    }

    if (isSiblingMd) {
      headers.set('Link', `<${canonicalUrl}>; rel="canonical"`);
    }

    return new NextResponse(isHead ? null : body, {
      status,
      headers,
    });
  };

  try {
    // 1. Home route
    if (subPath.length === 0) {
      const [catResult, rankResult] = await Promise.all([
        client.query<{ categories: Array<{ slug: string; labelKo: string; labelEn: string }> }>({
          query: CATEGORIES_QUERY,
          variables: { first: 12, locale },
        }),
        client.query<{ rankedProducts: Array<{ slug: string; name: string; summary?: string | null }> }>({
          query: RANKED_PRODUCTS_QUERY,
          variables: { first: 10, locale },
        }),
      ]);

      const categories = (catResult.data?.categories ?? []).map(c => ({
        slug: c.slug,
        label: locale === 'ko' ? c.labelKo : c.labelEn,
      }));

      const body = buildHomeMarkdown({
        locale,
        categories,
        featuredProducts: rankResult.data?.rankedProducts ?? [],
      });
      return createResponse(body);
    }

    // 2. Ranking route
    if (subPath.length === 1 && subPath[0] === 'ranking') {
      const result = await client.query<{
        rankedProducts: Array<{ name: string; slug: string; summary?: string | null; voteCount?: number }>;
      }>({
        query: RANKED_PRODUCTS_QUERY,
        variables: { first: 30, locale },
      });

      const body = buildRankingMarkdown({
        locale,
        products: result.data?.rankedProducts ?? [],
      });
      return createResponse(body);
    }

    // 3. About route
    if (subPath.length === 1 && subPath[0] === 'about') {
      const isKo = locale === 'ko';
      const body = [
        `# ${isKo ? '다른(darun) 소개 및 편집 원칙' : 'About Darun and Editorial Policy'}`,
        '',
        `Canonical URL: ${absolutePublicUrl(locale, '/about')}`,
        '',
        isKo
          ? '다른(darun)은 사용자가 자신에게 맞는 소프트웨어와 도구를 쉽게 탐색하고 비교할 수 있도록 돕는 소프트웨어 디스커버리 플랫폼입니다.'
          : 'Darun is a software discovery and comparison platform helping users find, evaluate, and choose the right tools for their workflows.',
        '',
        isKo ? '## 편집 및 데이터 원칙' : '## Editorial & Data Policy',
        '',
        isKo
          ? '- 모든 서비스 정보와 대안 목록은 투명하게 제공됩니다.\n- 외부 서비스의 요금제 및 기능은 변경될 수 있으므로 공식 웹사이트 링크를 함께 확인하시기 바랍니다.\n- 제휴나 후원에 의해 순위나 평가가 임의로 왜곡되지 않습니다.'
          : '- Product information and alternative recommendations are provided transparently.\n- External service features and pricing may change; always check the verified official website.\n- Rankings and recommendations are not distorted by unauthorized sponsorship.',
        '',
        `- [${isKo ? '홈으로 가기' : 'Home'}](${absolutePublicUrl(locale, '')})`,
      ].join('\n');
      return createResponse(body);
    }

    // 4. Products: detail or alternatives
    if (subPath[0] === 'products' && subPath.length >= 2) {
      const slug = subPath[1];
      if (!slug) return createResponse(buildNotFoundMarkdown({ locale }), 404);

      const result = await client.query<{ productBySlug: ProductQueryResult | null }>({
        query: PRODUCT_QUERY,
        variables: { slug, locale },
      });

      const product = result.data?.productBySlug;
      if (!product) {
        return createResponse(buildNotFoundMarkdown({ locale }), 404);
      }

      // 4a. /products/:slug/alternatives
      if (subPath.length === 3 && subPath[2] === 'alternatives') {
        const body = buildProductAlternativesMarkdown({
          locale,
          product: { name: product.name, slug: product.slug },
          alternatives: product.alternatives ?? [],
        });
        const noindex = (product.alternatives ?? []).length === 0;
        return createResponse(body, 200, { noindex });
      }

      // 4b. /products/:slug
      if (subPath.length === 2) {
        const body = buildProductMarkdown({
          locale,
          product,
          alternatives: product.alternatives ?? [],
        });
        return createResponse(body);
      }
    }

    // 5. Category: /categories/:slug
    if (subPath[0] === 'categories' && subPath.length === 2) {
      const slug = subPath[1];
      if (!slug) return createResponse(buildNotFoundMarkdown({ locale }), 404);

      const [catListResult, prodResult] = await Promise.all([
        client.query<{ categories: Array<{ slug: string; labelKo: string; labelEn: string }> }>({
          query: CATEGORIES_QUERY,
          variables: { first: 100, locale },
        }),
        client.query<{ productsByCategory: Array<{ name: string; slug: string; summary?: string | null }> }>({
          query: PRODUCTS_BY_CATEGORY_QUERY,
          variables: { slug, locale },
        }),
      ]);

      const category = (catListResult.data?.categories ?? []).find(c => c.slug === slug);
      if (!category) {
        return createResponse(buildNotFoundMarkdown({ locale }), 404);
      }

      const body = buildCategoryMarkdown({
        locale,
        category: {
          slug: category.slug,
          label: locale === 'ko' ? category.labelKo : category.labelEn,
        },
        products: prodResult.data?.productsByCategory ?? [],
      });
      return createResponse(body);
    }

    // 6. Compare: /compare/:slug1/:slug2
    if (subPath[0] === 'compare' && subPath.length === 3) {
      const slug1 = subPath[1];
      const slug2 = subPath[2];
      if (!slug1 || !slug2) return createResponse(buildNotFoundMarkdown({ locale }), 404);

      const [prod1Result, prod2Result] = await Promise.all([
        client.query<{ productBySlug: ProductQueryResult | null }>({
          query: PRODUCT_QUERY,
          variables: { slug: slug1, locale },
        }),
        client.query<{ productBySlug: ProductQueryResult | null }>({
          query: PRODUCT_QUERY,
          variables: { slug: slug2, locale },
        }),
      ]);

      const prod1 = prod1Result.data?.productBySlug;
      const prod2 = prod2Result.data?.productBySlug;

      if (!prod1 || !prod2) {
        return createResponse(buildNotFoundMarkdown({ locale }), 404);
      }

      const body = buildCompareMarkdown({
        locale,
        product1: prod1,
        product2: prod2,
      });
      // Strategy A: compare pages have NO_INDEX_ROBOTS
      return createResponse(body, 200, { noindex: true });
    }

    // 7. Magazine: /magazines/:slug
    if (subPath[0] === 'magazines' && subPath.length === 2) {
      const slug = subPath[1];
      if (!slug) return createResponse(buildNotFoundMarkdown({ locale }), 404);

      const result = await client.query<{ magazineBySlug: MagazineQueryResult | null }>({
        query: MAGAZINE_QUERY,
        variables: { slug },
      });

      const mag = result.data?.magazineBySlug;
      if (!mag) {
        return createResponse(buildNotFoundMarkdown({ locale }), 404);
      }

      const body = buildMagazineMarkdown({
        locale,
        magazine: {
          title: mag.title,
          slug: mag.slug,
          body: mag.content,
          publishedAt: mag.publishedAt,
          authorName: mag.author?.name,
        },
      });
      // Magazines in en are noindex per ko-only magazine policy
      const noindex = locale === 'en';
      return createResponse(body, 200, { noindex });
    }

    // Unmatched route -> 404
    return createResponse(buildNotFoundMarkdown({ locale }), 404);
  } catch (error) {
    console.error('Error serving markdown representation:', error);
    return createResponse(buildNotFoundMarkdown({ locale }), 404);
  }
}
