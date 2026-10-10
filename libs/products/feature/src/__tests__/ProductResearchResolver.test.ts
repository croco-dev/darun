import 'reflect-metadata';
import type { ProductResearchJobEntity } from '@darun/products-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductResearchMutationResolver } from '../ProductResearch.resolver';

vi.mock('typedi', async importOriginal => {
  const actual = await importOriginal<typeof import('typedi')>();
  return {
    ...actual,
    Service: () => () => {},
    Inject: () => () => {},
  };
});
vi.mock('@darun/utils-apollo-server', () => ({ AuthRole: { Admin: 'Admin' } }));
vi.mock('@darun/utils-llm', () => ({ BraveSearchClient: vi.fn(), LlmClient: vi.fn() }));
vi.mock('@darun/translation-service', () => ({ LlmSettingService: vi.fn() }));
vi.mock('type-graphql', () => {
  const dummyDecorator = () => () => {};
  return {
    Arg: dummyDecorator,
    Authorized: dummyDecorator,
    Field: dummyDecorator,
    ID: 'ID',
    InputType: dummyDecorator,
    Int: 'Int',
    GraphQLISODateTime: 'Date',
    Mutation: dummyDecorator,
    ObjectType: dummyDecorator,
    Query: dummyDecorator,
    Resolver: dummyDecorator,
  };
});

function jobEntity(overrides: Partial<ProductResearchJobEntity> = {}): ProductResearchJobEntity {
  return {
    id: 'job-1',
    requestKey: 'url:abc',
    officialUrl: 'https://linear.app/',
    status: 'completed',
    stage: null,
    errorCode: null,
    errorMessage: null,
    result: null,
    sourceSnapshotHash: null,
    promptVersion: null,
    model: null,
    leaseToken: null,
    leaseUntil: null,
    attemptCount: 1,
    materializedProductId: null,
    appliedAt: null,
    createdAt: new Date('2026-10-10T00:00:00Z'),
    updatedAt: new Date('2026-10-10T00:00:00Z'),
    ...overrides,
  };
}

describe('ProductResearchMutationResolver', () => {
  const requestResearch = vi.fn();
  const executeResearch = vi.fn();
  const materializeReviewedProduct = vi.fn();
  const sendJob = vi.fn();
  const findById = vi.fn();

  function createResolver() {
    return new ProductResearchMutationResolver(
      { findById } as never,
      {} as never,
      {} as never,
      { requestResearch, executeResearch } as never,
      { materializeReviewedProduct } as never,
      { sendJob } as never,
      {} as never,
      { getBraveApiKey: vi.fn().mockResolvedValue(null) } as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues a new research job via SQS when available', async () => {
    const job = jobEntity({ status: 'pending' });
    requestResearch.mockResolvedValueOnce({ job, queued: true });
    sendJob.mockResolvedValueOnce(true);
    const resolver = createResolver();
    // Avoid building real LLM/search clients in this unit test.
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.requestProductResearch({ officialUrl: 'https://linear.app/' });
    expect(result.id).toBe('job-1');
    expect(sendJob).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(executeResearch).not.toHaveBeenCalled();
  });

  it('materializes only validated reviewed products', async () => {
    materializeReviewedProduct.mockResolvedValueOnce({
      product: {
        id: 'prod-1',
        name: 'Linear',
        slug: 'linear',
        summary: '요약',
        logoUrl: 'https://linear.app/logo.png',
      },
      alreadyCreated: false,
    });
    const resolver = createResolver();
    const product = await resolver.materializeResearchedProduct({
      researchJobId: 'job-1',
      name: 'Linear',
      slug: 'linear',
      summary: '요약',
      logoUrl: 'https://linear.app/logo.png',
      officialUrl: 'https://linear.app/',
      categoryIds: ['cat-1'],
      features: [],
      tags: [],
    });
    expect(materializeReviewedProduct).toHaveBeenCalledWith(
      expect.objectContaining({ researchJobId: 'job-1', slug: 'linear' })
    );
    expect(product.slug).toBe('linear');
  });
});
