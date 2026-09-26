import { describe, expect, it, vi } from 'vitest';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductFeature } from '../entities/ProductFeature';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductDescriptionEvidenceAssembler } from '../services/ProductDescriptionEvidenceAssembler';

function createMockProductRepo(): Pick<ProductRepository, 'findOneById'> {
  return { findOneById: vi.fn() };
}

function createMockFeatureRepo(): Pick<ProductFeatureRepository, 'findManyByProductId'> {
  return { findManyByProductId: vi.fn() };
}

function createMockCategoryRepo(): Pick<CategoryRepository, 'findOneById'> {
  return { findOneById: vi.fn() };
}

describe('ProductDescriptionEvidenceAssembler', () => {
  it('assembles evidence with summary, sorted categories, and sorted features', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product = new Product({
      id: 'prod-1',
      name: '  토스  ',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: ' 금융의 모든 것 ',
      description: '<p>기존 설명</p>',
      categoryIds: ['cat-b', 'cat-a'],
      updatedAt: new Date(1000),
    });

    const categoryA = new Category({
      id: 'cat-a',
      slug: 'fintech',
      labelKo: '핀테크',
      labelEn: 'Fintech',
    });

    const categoryB = new Category({
      id: 'cat-b',
      slug: 'finance',
      labelKo: '',
      labelEn: 'Finance',
    });

    const features = [
      new ProductFeature({
        id: 'feat-z',
        productId: 'prod-1',
        name: '송금',
        summary: '간편한 무료 송금',
        emoji: '💸',
      }),
      new ProductFeature({
        id: 'feat-a',
        productId: 'prod-1',
        name: '결제',
        summary: 'QR 결제',
        emoji: '💳',
      }),
    ];

    vi.mocked(productRepo.findOneById).mockResolvedValue(product);
    vi.mocked(categoryRepo.findOneById).mockImplementation(async (id: string) => {
      if (id === 'cat-a') return categoryA;
      if (id === 'cat-b') return categoryB;
      return null;
    });
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue(features);

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    const result = await assembler.assemble('prod-1');

    expect(result.evidence.productId).toBe('prod-1');
    expect(result.evidence.productName).toBe('토스');
    expect(result.evidence.items).toEqual([
      {
        id: 'product:summary',
        kind: 'product_summary',
        text: '금융의 모든 것',
      },
      {
        id: 'category:cat-a',
        kind: 'category',
        text: '핀테크',
      },
      {
        id: 'category:cat-b',
        kind: 'category',
        text: 'Finance',
      },
      {
        id: 'feature:feat-a',
        kind: 'feature',
        title: '결제',
        text: 'QR 결제',
      },
      {
        id: 'feature:feat-z',
        kind: 'feature',
        title: '송금',
        text: '간편한 무료 송금',
      },
    ]);

    expect(result.evidenceHash).toBeDefined();
    expect(result.baseDescriptionHash).toBeDefined();
  });

  it('produces identical evidenceHash when timestamps change but content is same', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product1 = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '설명',
      categoryIds: [],
      updatedAt: new Date(1000),
    });

    const product2 = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '설명',
      categoryIds: [],
      updatedAt: new Date(999999),
    });

    vi.mocked(productRepo.findOneById).mockResolvedValueOnce(product1).mockResolvedValueOnce(product2);
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    const res1 = await assembler.assemble('prod-1');
    const res2 = await assembler.assemble('prod-1');

    expect(res1.evidenceHash).toBe(res2.evidenceHash);
    expect(res1.baseDescriptionHash).toBe(res2.baseDescriptionHash);
  });

  it('changes evidenceHash when summary or features change, but baseDescriptionHash changes only when description changes', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product1 = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '기존 설명',
      categoryIds: [],
    });

    const product2 = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '수정된 금융 요약',
      description: '기존 설명',
      categoryIds: [],
    });

    const product3 = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '수정된 설명',
      categoryIds: [],
    });

    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    vi.mocked(productRepo.findOneById).mockResolvedValueOnce(product1);
    const res1 = await assembler.assemble('prod-1');

    vi.mocked(productRepo.findOneById).mockResolvedValueOnce(product2);
    const res2 = await assembler.assemble('prod-1');

    vi.mocked(productRepo.findOneById).mockResolvedValueOnce(product3);
    const res3 = await assembler.assemble('prod-1');

    // res2 changed summary -> evidenceHash different, baseDescriptionHash same as res1
    expect(res1.evidenceHash).not.toBe(res2.evidenceHash);
    expect(res1.baseDescriptionHash).toBe(res2.baseDescriptionHash);

    // res3 changed description -> evidenceHash same as res1, baseDescriptionHash different
    expect(res1.evidenceHash).toBe(res3.evidenceHash);
    expect(res1.baseDescriptionHash).not.toBe(res3.baseDescriptionHash);
  });

  it('fails when product is not found', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    vi.mocked(productRepo.findOneById).mockResolvedValue(null);

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    await expect(assembler.assemble('non-existent')).rejects.toThrow();
  });

  it('fails when a referenced category cannot be resolved', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      categoryIds: ['missing-cat'],
    });

    vi.mocked(productRepo.findOneById).mockResolvedValue(product);
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    vi.mocked(categoryRepo.findOneById).mockResolvedValue(null);

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    await expect(assembler.assemble('prod-1')).rejects.toThrow('Category not found for id: missing-cat');
  });

  it('fails when a category has empty label', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      categoryIds: ['blank-cat'],
    });

    vi.mocked(productRepo.findOneById).mockResolvedValue(product);
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    vi.mocked(categoryRepo.findOneById).mockResolvedValue(
      new Category({
        id: 'blank-cat',
        slug: 'blank',
        labelKo: '   ',
        labelEn: '',
      })
    );

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    await expect(assembler.assemble('prod-1')).rejects.toThrow('Category label is empty for category: blank-cat');
  });

  it('fails when feature repository query fails', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();

    const product = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      categoryIds: [],
    });

    vi.mocked(productRepo.findOneById).mockResolvedValue(product);
    vi.mocked(featureRepo.findManyByProductId).mockRejectedValue(new Error('DB Connection Timeout'));

    const assembler = new ProductDescriptionEvidenceAssembler(
      productRepo as never,
      featureRepo as never,
      categoryRepo as never
    );

    await expect(assembler.assemble('prod-1')).rejects.toThrow('DB Connection Timeout');
  });
});
