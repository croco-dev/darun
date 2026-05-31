import { describe, expect, it } from 'vitest';
import { SearchableProduct } from '../entities/SearchableProduct';

describe('SearchableProduct', () => {
  it('creates with default tags and category when omitted', () => {
    const product = new SearchableProduct({
      slug: 'test-product',
      name: 'Test Product',
      summary: 'A test product',
    });

    expect(product.tags).toEqual([]);
    expect(product.category).toBe('');
  });

  it('creates with provided tags and category', () => {
    const product = new SearchableProduct({
      slug: 'test-product',
      name: 'Test Product',
      summary: 'A test product',
      tags: ['editor', 'design'],
      category: 'software',
    });

    expect(product.tags).toEqual(['editor', 'design']);
    expect(product.category).toBe('software');
  });

  it('creates with empty tags array when explicitly passed', () => {
    const product = new SearchableProduct({
      slug: 'test-product',
      name: 'Test Product',
      summary: 'A test product',
      tags: [],
      category: '',
    });

    expect(product.tags).toEqual([]);
    expect(product.category).toBe('');
  });
});
