import { createHash } from 'node:crypto';

export function productPublishReviewToken(product: { id: string; contentRevision: bigint; logoUrl: string }) {
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([product.contentRevision.toString(), product.logoUrl]))
    .digest('hex');
  return `${product.id}.${fingerprint}`;
}
