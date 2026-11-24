import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';

const screenshots = Array.from({ length: 3 }, (_, index) => ({
  __typename: 'Screenshot',
  id: `touch-photo-${index}`,
  imageUrl: `/images/default-product-icon.svg?touch=${index}`,
  imageAlt: `Touch preview ${index + 1}`,
}));
const nativeTouchProduct = {
  __typename: 'Product',
  id: 'touch-product',
  slug: 'figma-e2e',
  name: 'Figma E2E',
  summary: 'Native touch scrolling fixture',
  description: '<h2>Overview</h2><p>Native scrolling with product photos and features.</p>',
  logoUrl: '/images/default-product-icon.svg',
  tags: Array.from({ length: 8 }, (_, index) => ({
    __typename: 'Tag',
    id: `touch-tag-${index}`,
    name: `Tag ${index}`,
  })),
  screenshots,
  features: [
    {
      __typename: 'Feature',
      id: 'touch-feature',
      name: 'Touch feature',
      emoji: '📷',
      summary: 'Feature screenshots',
      screenshots: screenshots.map(photo => ({
        ...photo,
        __typename: 'FeatureScreenshot',
        imageAlt: photo.imageAlt.replace('Touch preview', 'Feature preview'),
      })),
    },
  ],
  links: [],
  alternatives: [],
  hasAlternatives: false,
  ownedCompany: null,
  voteCount: 0,
};

const companyRead = Promise.withResolvers<void>();
const homeScenarios = ['count-delayed-error', 'count-zero', 'count-positive', 'category-error'] as const;
let homeScenario: (typeof homeScenarios)[number] | 'count-error' = 'count-positive';
const heldProductCounts = new Set<ServerResponse>();
const countErrorResponse = JSON.stringify({ data: null, errors: [{ message: 'Fixture count unavailable' }] });

function applyHomeScenario(scenario: string): number {
  if (scenario === 'release-count') {
    homeScenario = 'count-error';
    const hadPendingCount = heldProductCounts.size > 0;
    for (const countResponse of heldProductCounts) countResponse.end(countErrorResponse);
    heldProductCounts.clear();
    return hadPendingCount ? 204 : 409;
  }

  const selected = homeScenarios.find(value => value === scenario);
  if (!selected) return 404;
  homeScenario = selected;
  return 204;
}

const homeCategory = {
  __typename: 'Category',
  id: 'home-productivity',
  slug: 'productivity',
  labelKo: '생산성 도구',
  labelEn: 'Productivity tools',
};
const homeRecentProduct = { ...nativeTouchProduct, id: 'home-recent', slug: 'recent-fixture', name: 'Recent Fixture' };
const compareProduct = {
  ...nativeTouchProduct,
  id: 'compare-product',
  slug: 'compare-fixture',
  name: 'Collaboration and Project Planning Workspace for Distributed Product Teams',
  summary: 'Overview of a shared workspace for planning releases and coordinating product design across teams.',
  logoUrl: null,
  voteCount: null,
};
const homeCategoryProducts = {
  __typename: 'ProductConnection',
  totalCount: 1,
  edges: [{ __typename: 'ProductEdge', node: nativeTouchProduct }],
  pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
};
const delayedCompany = {
  id: 'delayed-company',
  name: 'Delayed Company',
  type: '',
  address: '',
  startAt: null,
};
const productWithDesignatedLink = {
  ...nativeTouchProduct,
  slug: 'product-link-roles',
  links: [
    {
      __typename: 'Link',
      id: 'legacy-link',
      title: '공식 홈페이지',
      link: 'https://example.com/home',
      displayLink: '',
      iconUrl: '//third-party.example/legacy-icon.svg',
      isPrimary: false,
      role: null,
    },
    {
      __typename: 'Link',
      id: 'docs-link',
      title: '',
      link: 'https://example.com/docs',
      displayLink: '',
      iconUrl:
        'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg',
      isPrimary: true,
      role: 'documentation',
    },
    {
      __typename: 'Link',
      id: 'official-link',
      title: 'Linear 공식 사이트',
      link: 'https://example.com/visit',
      displayLink: '',
      iconUrl: 'https://research-logo.example/linear.png',
      isPrimary: false,
      role: 'official',
    },
  ],
};

function getFixtureProduct(slug?: string) {
  if (slug === homeRecentProduct.slug) return homeRecentProduct;
  if (slug === compareProduct.slug) return compareProduct;
  if (slug === productWithDesignatedLink.slug) return productWithDesignatedLink;
  return nativeTouchProduct;
}

// Both SSR and browser reads use this loopback-only fixture. No database or external API is involved.
createServer((request, response) => {
  if (request.method === 'POST' && request.url?.startsWith('/home-scenario/')) {
    const scenario = request.url.slice('/home-scenario/'.length);
    response.writeHead(applyHomeScenario(scenario)).end();
    return;
  }
  if (request.url === '/release-company' && request.method === 'POST') {
    companyRead.resolve();
    response.writeHead(204).end();
    return;
  }
  if (request.url?.split('?')[0] === '/monitoring') {
    request.resume();
    response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:16471');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  let body = '';
  request.on('data', chunk => (body += chunk));
  request.on('end', async () => {
    const { operationName, query, variables } = body ? JSON.parse(body) : {};
    response.setHeader('Content-Type', 'application/json');
    if (operationName === 'ProductsForCompare') {
      response.end(
        JSON.stringify({
          data: {
            product1: getFixtureProduct(variables.slug1),
            product2: getFixtureProduct(variables.slug2),
          },
        })
      );
      return;
    }
    if (operationName === 'ProductVoteCount' && variables.slug === compareProduct.slug) {
      response.end(
        JSON.stringify({
          data: { productBySlug: { ...compareProduct, voteCount: 17 } },
        })
      );
      return;
    }
    if (operationName === 'ProductsCountOnHomePage') {
      if (homeScenario === 'count-delayed-error') {
        heldProductCounts.add(response);
        response.once('close', () => heldProductCounts.delete(response));
      } else if (homeScenario === 'count-error') {
        response.end(countErrorResponse);
      } else {
        response.end(JSON.stringify({ data: { productsCount: homeScenario === 'count-zero' ? 0 : 42 } }));
      }
      return;
    }
    if (operationName === 'CategoriesOnCategoryNavigationSection') {
      response.end(
        JSON.stringify(
          homeScenario === 'category-error'
            ? { data: null, errors: [{ message: 'Fixture categories unavailable' }] }
            : { data: { categories: [homeCategory] } }
        )
      );
      return;
    }
    const failPhoto = variables?.slug === 'unavailable-photos' && operationName === 'GetPhotosOnProductPhotos';
    const readsCompany = typeof query === 'string' && /\bownedCompany\s*\{/.test(query);
    const companyUnavailable = variables?.slug === 'unavailable-company' && readsCompany;
    if (failPhoto || companyUnavailable) {
      response.end(
        JSON.stringify({
          data: { productBySlug: failPhoto ? null : nativeTouchProduct },
          errors: [
            {
              message: 'Fixture section unavailable',
              path: failPhoto ? ['productBySlug'] : ['productBySlug', 'ownedCompany'],
            },
          ],
        })
      );
      return;
    }
    const companyDelayed = variables?.slug === 'delayed-company' && readsCompany;
    if (companyDelayed) await companyRead.promise;
    const product = getFixtureProduct(variables?.slug);
    response.end(
      JSON.stringify({
        data: {
          productBySlug:
            variables?.slug === 'missing-fixture-product'
              ? null
              : companyDelayed
                ? { ...product, ownedCompany: delayedCompany }
                : product,
          searchProducts: variables?.query === 'section-retry-fixture' ? [nativeTouchProduct] : [],
          categories: [],
          categoryBySlug: variables?.slug === homeCategory.slug ? homeCategory : null,
          productsByCategory: homeCategoryProducts,
          rankedProducts: operationName === 'TrendingProductsOnTrendingProductSection' ? [nativeTouchProduct] : [],
          recentProducts: [homeRecentProduct],
        },
      })
    );
  });
}).listen(16470, '127.0.0.1');
