import { createServer } from 'node:http';

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
      iconUrl: 'https://third-party.example/legacy-icon.svg',
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
      title: 'Visit the site',
      link: 'https://example.com/visit',
      displayLink: '',
      iconUrl: '/images/default-product-icon.svg',
      isPrimary: false,
      role: 'official',
    },
  ],
};

// Both SSR and browser reads use this loopback-only fixture. No database or external API is involved.
createServer((request, response) => {
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
    const product = variables?.slug === 'product-link-roles' ? productWithDesignatedLink : nativeTouchProduct;
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
          rankedProducts: [],
        },
      })
    );
  });
}).listen(16470, '127.0.0.1');
