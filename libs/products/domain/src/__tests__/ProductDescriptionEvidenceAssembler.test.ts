import { describe, expect, it, vi } from 'vitest';
import { Category } from '../entities/Category';
import { Product } from '../entities/Product';
import { ProductFeature } from '../entities/ProductFeature';
import { ProductFlow } from '../entities/ProductFlow';
import { ProductLink } from '../entities/ProductLink';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { ProductTag } from '../entities/ProductTag';
import { Tag } from '../entities/Tag';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { ProductResearchJobRepository } from '../repositories/ProductResearchJobRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import type { ProductTagRepository } from '../repositories/ProductTagRepository';
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

function createEmptyExtendedRepos() {
  const tagRepo: Pick<ProductTagRepository, 'findOneByProductId'> = {
    findOneByProductId: vi.fn().mockResolvedValue(null),
  };
  const linkRepo: Pick<ProductLinkRepository, 'findManyByProductId'> = {
    findManyByProductId: vi.fn().mockResolvedValue([]),
  };
  const screenshotRepo: Pick<ProductScreenshotRepository, 'findManyByProductIdSortByPriorityDesc'> = {
    findManyByProductIdSortByPriorityDesc: vi.fn().mockResolvedValue([]),
  };
  const flowRepo: Pick<ProductFlowRepository, 'findManyByProductId'> = {
    findManyByProductId: vi.fn().mockResolvedValue([]),
  };
  const researchRepo: Pick<ProductResearchJobRepository, 'findByProductId'> = {
    findByProductId: vi.fn().mockResolvedValue(null),
  };
  return { tagRepo, linkRepo, screenshotRepo, flowRepo, researchRepo };
}

function createAssembler(
  productRepo: unknown,
  featureRepo: unknown,
  categoryRepo: unknown,
  extended?: ReturnType<typeof createEmptyExtendedRepos>
) {
  const repos = extended ?? createEmptyExtendedRepos();
  return new ProductDescriptionEvidenceAssembler(
    productRepo as never,
    featureRepo as never,
    categoryRepo as never,
    repos.tagRepo as never,
    repos.linkRepo as never,
    repos.screenshotRepo as never,
    repos.flowRepo as never,
    repos.researchRepo as never
  );
}

function createAssemblerWithoutExtended(productRepo: unknown, featureRepo: unknown, categoryRepo: unknown) {
  return new ProductDescriptionEvidenceAssembler(
    productRepo as never,
    featureRepo as never,
    categoryRepo as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never
  );
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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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
    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

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

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo);

    await expect(assembler.assemble('prod-1')).rejects.toThrow('DB Connection Timeout');
  });

  it('injects tags, links, screenshots, flows, and research within quotas', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();
    const extended = createEmptyExtendedRepos();

    const product = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '<p>기존 설명</p>',
      categoryIds: [],
    });
    vi.mocked(productRepo.findOneById).mockResolvedValue(product);
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    vi.mocked(extended.tagRepo.findOneByProductId).mockResolvedValue(
      new ProductTag({
        productId: 'prod-1',
        tags: [new Tag({ id: 'tag-1', name: '간편결제' }), new Tag({ id: 'tag-2', name: '송금' })],
      })
    );
    vi.mocked(extended.linkRepo.findManyByProductId).mockResolvedValue([
      new ProductLink({
        id: 'link-1',
        productId: 'prod-1',
        title: '공식 안내',
        link: 'https://example.com/guide',
        displayLink: '공식 안내',
        iconUrl: 'https://example.com/icon.png',
      }),
      new ProductLink({
        id: 'link-bad',
        productId: 'prod-1',
        title: '내부 링크',
        link: 'javascript:alert(1)',
        displayLink: '내부 링크',
        iconUrl: 'https://example.com/icon.png',
      }),
    ]);
    vi.mocked(extended.screenshotRepo.findManyByProductIdSortByPriorityDesc).mockResolvedValue([
      new ProductScreenshot({
        id: 'shot-1',
        productId: 'prod-1',
        imageUrl: 'https://example.com/shot.png',
        imageAlt: '송금 화면',
        title: '송금 화면',
        platform: 'IOS',
        screenType: 'DETAIL',
      }),
    ]);
    vi.mocked(extended.flowRepo.findManyByProductId).mockResolvedValue([
      new ProductFlow({
        id: 'flow-1',
        productId: 'prod-1',
        title: '송금 흐름',
        description: '계좌를 고르고 금액을 입력하는 흐름',
        platform: 'iOS',
        flowType: 'ONBOARDING',
        steps: [
          { screenshotId: 'shot-1', caption: '계좌 선택' },
          { screenshotId: 'shot-1', caption: '금액 입력' },
        ],
      }),
    ]);
    vi.mocked(extended.researchRepo.findByProductId).mockResolvedValue({
      id: 'research-1',
      requestKey: 'key',
      officialUrl: 'https://example.com',
      status: 'completed',
      stage: null,
      errorCode: null,
      errorMessage: null,
      result: {
        version: 1,
        originalUrl: 'https://example.com',
        identity: {
          name: { value: '토스', anchors: [], evidenceType: 'INPUT_HOST' },
          suggestedSlug: 'toss',
        },
        summary: null,
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        sources: [
          {
            id: 'src-1',
            title: '공식 송금 안내',
            url: 'https://example.com/guide',
            hostname: 'example.com',
            snippet: '수수료 없는 송금을 지원합니다.',
            extraSnippets: [],
            relationToInput: 'INPUT_HOST_MATCH',
          },
        ],
        warnings: [],
        sourceSnapshotHash: 'hash',
        promptVersion: 'v1',
        model: 'model',
      },
      sourceSnapshotHash: 'hash',
      promptVersion: 'v1',
      model: 'model',
      leaseToken: null,
      leaseUntil: null,
      attemptCount: 1,
      materializedProductId: 'prod-1',
      appliedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo, extended);
    const result = await assembler.assemble('prod-1');
    const kinds = result.evidence.items.map(item => item.kind);

    expect(kinds).toContain('tag');
    expect(kinds).toContain('link');
    expect(kinds).toContain('screenshot');
    expect(kinds).toContain('flow');
    expect(kinds).toContain('research');
    expect(result.evidence.items.some(item => item.id === 'link:link-bad')).toBe(false);
    expect(result.evidenceHash).toBeDefined();
  });

  it('changes evidenceHash when an extended signal changes', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();
    const product = new Product({
      id: 'prod-1',
      name: '토스',
      slug: 'toss',
      logoUrl: 'https://example.com/logo.png',
      summary: '금융의 모든 것',
      description: '설명',
      categoryIds: [],
    });

    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    vi.mocked(productRepo.findOneById).mockResolvedValue(product);

    const extendedA = createEmptyExtendedRepos();
    vi.mocked(extendedA.tagRepo.findOneByProductId).mockResolvedValue(
      new ProductTag({ productId: 'prod-1', tags: [new Tag({ id: 'tag-1', name: '송금' })] })
    );
    const assemblerA = createAssembler(productRepo, featureRepo, categoryRepo, extendedA);
    const before = await assemblerA.assemble('prod-1');

    const extendedB = createEmptyExtendedRepos();
    vi.mocked(extendedB.tagRepo.findOneByProductId).mockResolvedValue(
      new ProductTag({
        productId: 'prod-1',
        tags: [new Tag({ id: 'tag-1', name: '송금' }), new Tag({ id: 'tag-2', name: '결제' })],
      })
    );
    const assemblerB = createAssembler(productRepo, featureRepo, categoryRepo, extendedB);
    const after = await assemblerB.assemble('prod-1');

    expect(before.evidenceHash).not.toBe(after.evidenceHash);
    expect(before.baseDescriptionHash).toBe(after.baseDescriptionHash);
  });

  it('ignores extended repository failures without failing assembly', async () => {
    const productRepo = createMockProductRepo();
    const featureRepo = createMockFeatureRepo();
    const categoryRepo = createMockCategoryRepo();
    const extended = createEmptyExtendedRepos();

    vi.mocked(productRepo.findOneById).mockResolvedValue(
      new Product({
        id: 'prod-1',
        name: '토스',
        slug: 'toss',
        logoUrl: 'https://example.com/logo.png',
        summary: '금융의 모든 것',
        categoryIds: [],
      })
    );
    vi.mocked(featureRepo.findManyByProductId).mockResolvedValue([]);
    vi.mocked(extended.tagRepo.findOneByProductId).mockRejectedValue(new Error('tag store down'));

    const assembler = createAssembler(productRepo, featureRepo, categoryRepo, extended);
    const result = await assembler.assemble('prod-1');

    expect(result.evidence.items.map(item => item.id)).toEqual(['product:summary']);
  });
});
