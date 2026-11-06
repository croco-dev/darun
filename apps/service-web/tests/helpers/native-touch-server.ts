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
      })),
    },
  ],
  links: [],
  alternatives: [],
  hasAlternatives: false,
  ownedCompany: null,
  voteCount: 0,
};

// Both SSR and browser reads use this loopback-only fixture. No database or external API is involved.
createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:16471');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      data: {
        productBySlug: nativeTouchProduct,
        searchProducts: [],
        categories: [],
        rankedProducts: [],
      },
    })
  );
}).listen(16470, '127.0.0.1');
