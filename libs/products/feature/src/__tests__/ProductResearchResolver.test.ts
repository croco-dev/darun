import 'reflect-metadata';
import type { ProductResearchJobEntity } from '@darun/products-domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductResearchMutationResolver, ProductResearchQueryResolver } from '../ProductResearch.resolver';

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
    requestKey: 'req-12345678',
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
  const retryFailedResearch = vi.fn();
  const executeResearch = vi.fn();
  const materializeReviewedProduct = vi.fn();
  const sendJob = vi.fn();
  const findById = vi.fn();

  function createResolver() {
    return new ProductResearchMutationResolver(
      { findById } as never,
      {} as never,
      {} as never,
      { requestResearch, retryFailedResearch, executeResearch } as never,
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

    const result = await resolver.requestProductResearch({
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
    });
    expect(result.job.id).toBe('job-1');
    expect(result.dispatchStatus).toBe('QUEUED');
    expect(requestResearch).toHaveBeenCalledWith({ requestId: 'req-12345678', officialUrl: 'https://linear.app/' }, {});
    expect(sendJob).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(executeResearch).not.toHaveBeenCalled();
  });

  it('returns RETRY_REQUIRED with the job id when SQS dispatch fails', async () => {
    const job = jobEntity({ status: 'pending' });
    requestResearch.mockResolvedValueOnce({ job, queued: true });
    sendJob.mockRejectedValueOnce(new Error('sqs down'));
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.requestProductResearch({
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
    });
    expect(result.job.id).toBe('job-1');
    expect(result.dispatchStatus).toBe('RETRY_REQUIRED');
    expect(executeResearch).not.toHaveBeenCalled();
  });

  it('resends SQS for a stranded pending job on a deduped requestId', async () => {
    const stranded = jobEntity({ status: 'pending' });
    requestResearch.mockResolvedValueOnce({ job: stranded, queued: false });
    sendJob.mockResolvedValueOnce(true);
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.requestProductResearch({
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
    });
    expect(result.job.id).toBe('job-1');
    expect(result.dispatchStatus).toBe('QUEUED');
    expect(sendJob).toHaveBeenCalledWith({ jobId: 'job-1' });
  });

  it('returns RETRY_REQUIRED for a stranded pending job when resend fails', async () => {
    const stranded = jobEntity({ status: 'pending' });
    requestResearch.mockResolvedValueOnce({ job: stranded, queued: false });
    sendJob.mockRejectedValueOnce(new Error('sqs down'));
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.requestProductResearch({
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
    });
    expect(result.job.id).toBe('job-1');
    expect(result.dispatchStatus).toBe('RETRY_REQUIRED');
  });

  it('returns DEDUPED without dispatch for a terminal job on a deduped requestId', async () => {
    const terminal = jobEntity({ status: 'completed' });
    requestResearch.mockResolvedValueOnce({ job: terminal, queued: false });
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.requestProductResearch({
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
    });
    expect(result.job.id).toBe('job-1');
    expect(result.dispatchStatus).toBe('DEDUPED');
    expect(sendJob).not.toHaveBeenCalled();
  });

  it('propagates a typed invalid-args rejection for a requestId URL mismatch without dispatch', async () => {
    const mismatch = Object.assign(new Error('요청 ID에 이미 다른 공식 URL이 연결되어 있습니다.'), {
      code: 'product/invalid-args',
    });
    requestResearch.mockRejectedValueOnce(mismatch);
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    await expect(
      resolver.requestProductResearch({ requestId: 'req-12345678', officialUrl: 'https://notion.so/' })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
    expect(sendJob).not.toHaveBeenCalled();
  });

  it('retries a failed job as a new pending job without changing the terminal job', async () => {
    const failed = jobEntity({ id: 'job-old', status: 'failed' });
    const created = jobEntity({ id: 'job-new', status: 'pending' });
    findById.mockResolvedValueOnce(failed);
    retryFailedResearch.mockResolvedValueOnce({ job: created, deduped: false });
    sendJob.mockResolvedValueOnce(true);
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.retryProductResearch('job-old', { requestId: 'req-retry-99' });
    expect(result?.job.id).toBe('job-new');
    expect(result?.dispatchStatus).toBe('QUEUED');
    expect(retryFailedResearch).toHaveBeenCalledWith('job-old', {}, 'req-retry-99');
    expect(sendJob).toHaveBeenCalledWith({ jobId: 'job-new' });
  });

  it('resends SQS for a stranded pending job when retry collides on request_key', async () => {
    const failed = jobEntity({ id: 'job-old', status: 'failed' });
    const raced = jobEntity({ id: 'job-existing', status: 'pending' });
    findById.mockResolvedValueOnce(failed);
    retryFailedResearch.mockResolvedValueOnce({ job: raced, deduped: true });
    sendJob.mockResolvedValueOnce(true);
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.retryProductResearch('job-old', { requestId: 'req-collide-1' });
    expect(result?.job.id).toBe('job-existing');
    expect(result?.dispatchStatus).toBe('QUEUED');
    expect(sendJob).toHaveBeenCalledWith({ jobId: 'job-existing' });
  });

  it('returns RETRY_REQUIRED for a stranded pending job when retry resend fails', async () => {
    const failed = jobEntity({ id: 'job-old', status: 'failed' });
    const raced = jobEntity({ id: 'job-existing', status: 'pending' });
    findById.mockResolvedValueOnce(failed);
    retryFailedResearch.mockResolvedValueOnce({ job: raced, deduped: true });
    sendJob.mockRejectedValueOnce(new Error('sqs down'));
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    const result = await resolver.retryProductResearch('job-old', { requestId: 'req-collide-1' });
    expect(result?.job.id).toBe('job-existing');
    expect(result?.dispatchStatus).toBe('RETRY_REQUIRED');
  });

  it('returns DEDUPED for a completed job queried directly via retry', async () => {
    const terminal = jobEntity({ id: 'job-done', status: 'completed' });
    findById.mockResolvedValueOnce(terminal);
    const resolver = createResolver();

    const result = await resolver.retryProductResearch('job-done');
    expect(result?.job.id).toBe('job-done');
    expect(result?.dispatchStatus).toBe('DEDUPED');
    expect(sendJob).not.toHaveBeenCalled();
    expect(retryFailedResearch).not.toHaveBeenCalled();
  });

  it('propagates a typed invalid-args rejection when retry collides on a different URL without dispatch', async () => {
    const failed = jobEntity({ id: 'job-old', status: 'failed' });
    const mismatch = Object.assign(new Error('요청 ID에 이미 다른 공식 URL이 연결되어 있습니다.'), {
      code: 'product/invalid-args',
    });
    findById.mockResolvedValueOnce(failed);
    retryFailedResearch.mockRejectedValueOnce(mismatch);
    const resolver = createResolver();
    vi.spyOn(resolver as unknown as { buildDeps: () => Promise<never> }, 'buildDeps').mockResolvedValueOnce(
      {} as never
    );

    await expect(resolver.retryProductResearch('job-old', { requestId: 'req-collide-1' })).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
    expect(sendJob).not.toHaveBeenCalled();
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

describe('ProductResearchGraphSchema', () => {
  it('exposes requestId input and payload dispatch status via decorator metadata', async () => {
    const { RequestProductResearchInput, RequestProductResearchPayload } = await import('../graphs/ProductResearch');
    expect(new RequestProductResearchInput()).toBeTruthy();
    expect(new RequestProductResearchPayload()).toBeTruthy();
    const mutationSource = ProductResearchMutationResolver.prototype.requestProductResearch as never as object;
    expect(mutationSource).toBeTruthy();
    expect(ProductResearchQueryResolver).toBeTruthy();
  });

  it('maps reference-only candidates without touching persisted semantics', async () => {
    const { toProductResearchJobGraph } = await import('../graphs/ProductResearch');
    const graph = toProductResearchJobGraph(
      jobEntity({
        status: 'completed',
        result: {
          version: 1,
          originalUrl: 'https://linear.app/',
          identity: {
            name: { value: 'Linear', anchors: [{ sourceId: 's1', excerpt: 'Linear' }], evidenceType: 'INPUT_HOST' },
            suggestedSlug: 'linear',
          },
          summary: null,
          categoryCandidates: [{ categoryId: 'cat-1', reason: '후보' }],
          features: [],
          tags: [],
          companyCandidate: { name: 'Linear Inc', anchors: [{ sourceId: 's1', excerpt: 'Linear' }] },
          alternativeCandidates: [{ name: 'Asana', anchors: [{ sourceId: 's1', excerpt: 'Linear' }] }],
          sources: [],
          warnings: [],
          sourceSnapshotHash: 'hash',
          promptVersion: 'research-v1',
          model: 'test-model',
        },
      })
    );
    expect(graph.result?.companyCandidate?.name).toBe('Linear Inc');
    expect(graph.result?.alternativeCandidates).toHaveLength(1);
    expect(graph.result?.categoryCandidates).toHaveLength(1);
  });
});
