import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { ProductResearchReviewService } from '../../../../libs/products/service/src/ProductResearchReviewService';

// Validate research input with the production service; keep fixture persistence in memory.
const review = new ProductResearchReviewService().validateReviewedInput({
  researchJobId: 'logo-job',
  name: 'External Logo',
  slug: 'external-logo',
  summary: '외부 로고 표시 fixture',
  logoUrl: 'http://127.0.0.1:16480/logo.png',
  officialUrl: 'https://example.org/',
  officialUrlConfirmed: true,
  categoryIds: [],
  features: [],
  tags: [],
});
const product = {
  ...review,
  __typename: 'Product',
  id: 'logo-product',
  description: '<p>외부 로고 검증</p>',
  screenshots: [],
  features: [],
  links: [],
  alternatives: [],
  hasAlternatives: false,
  ownedCompany: null,
  voteCount: 0,
};
const cloudinaryProduct = {
  ...product,
  id: 'cloudinary-product',
  slug: 'cloudinary-logo',
  name: 'Cloudinary Logo',
  logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png',
};
const png = readFileSync(new URL('../../public/images/favicon-32x32.png', import.meta.url));
const job = {
  __typename: 'ProductResearchJob',
  id: 'logo-job',
  status: 'completed',
  errorCode: null,
  errorMessage: null,
  officialUrl: review.officialUrl,
  materializedProductId: null,
  result: {
    originalUrl: review.officialUrl,
    name: { value: review.name, anchors: [], evidenceType: 'OFFICIAL' },
    suggestedSlug: review.slug,
    summary: { value: review.summary, anchors: [], evidenceType: 'OFFICIAL' },
    features: [],
    tags: [],
    warnings: [],
    sources: [],
    companyCandidate: null,
    alternativeCandidates: [],
    categoryCandidates: [],
  },
};
createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin === 'http://localhost:16481' || origin === 'http://localhost:16482') {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  response.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  if (request.method === 'OPTIONS') return response.writeHead(204).end();
  if (request.url === '/logo.png') return response.writeHead(200, { 'Content-Type': 'image/png' }).end(png);
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const respond = (operation: { variables?: { slug?: string } }) => ({
    data: {
      productBySlug: operation.variables?.slug === 'cloudinary-logo' ? cloudinaryProduct : product,
      product1: product,
      product2: cloudinaryProduct,
      rankedProducts: [product, cloudinaryProduct],
      recentProducts: [product, cloudinaryProduct],
      productsCount: 2,
      searchProducts: [],
      categories: [],
      productResearchJob: job,
    },
  });
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(Array.isArray(body) ? body.map(respond) : respond(body)));
}).listen(16480, '127.0.0.1');
