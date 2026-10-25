import assert from 'node:assert/strict';

export default async function setup() {
  const response = await fetch('http://127.0.0.1:4000/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: '{ rankedProducts(first: 1) { slug } searchProducts(query: "figma") { slug } }',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200, 'Smoke GraphQL readiness HTTP status');
  const result = await response.json();
  assert.equal(result.errors, undefined, 'Smoke GraphQL readiness returned errors');
  assert.equal(result.data?.rankedProducts?.[0]?.slug, 'notion-e2e-32');
  assert.ok(result.data?.searchProducts?.some((row: { slug: string }) => row.slug === 'figma-e2e'));
  console.log('Smoke GraphQL readiness: ranked fixture and real search both passed');
}
