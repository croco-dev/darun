import { describe, expect, it } from 'vitest';

import { Product } from '../entities/Product';

describe('Product entity', () => {
  it('should manage constructor, publish, update, and registerCompany', () => {
    const product = new Product({
      id: 'product-1',
      slug: 'darun-product',
      name: 'Darun Product',
      summary: 'Initial summary',
      description: 'Initial description',
      logoUrl: 'https://example.com/logo.png',
    });

    expect(product.id).toBe('product-1');
    expect(product.slug).toBe('darun-product');
    expect(product.name).toBe('Darun Product');
    expect(product.summary).toBe('Initial summary');
    expect(product.description).toBe('Initial description');
    expect(product.logoUrl).toBe('https://example.com/logo.png');
    expect(product.publishedAt).toBeUndefined();
    expect(product.updatedAt).toBeUndefined();
    expect(product.ownedCompanyId).toBeUndefined();

    product.publish();

    expect(product.publishedAt).toBeInstanceOf(Date);

    product.update({
      name: 'Updated Product',
      summary: 'Updated summary',
      description: 'Updated description',
      logoUrl: 'https://example.com/updated-logo.png',
    });

    expect(product.name).toBe('Updated Product');
    expect(product.summary).toBe('Updated summary');
    expect(product.description).toBe('Updated description');
    expect(product.logoUrl).toBe('https://example.com/updated-logo.png');
    expect(product.updatedAt).toBeInstanceOf(Date);

    product.registerCompany('company-1');

    expect(product.ownedCompanyId).toBe('company-1');
  });
});
