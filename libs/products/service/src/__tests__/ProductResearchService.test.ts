import {
  PRODUCT_RESEARCH_DRAFT_VERSION,
  hashSourceSnapshot,
  normalizeResearchSources,
  type NormalizedResearchSource,
} from '@darun/products-domain';
import { describe, expect, it, vi } from 'vitest';
import { ProductResearchService } from '../ProductResearchService';

function source(overrides: Partial<NormalizedResearchSource> = {}): NormalizedResearchSource {
  return {
    id: 's1',
    title: 'Linear 공식',
    url: 'https://linear.app/',
    hostname: 'linear.app',
    snippet: 'Linear는 이슈 트래킹 도구입니다',
    extraSnippets: ['빠르게 이슈를 관리합니다'],
    relationToInput: 'INPUT_HOST_MATCH',
    ...overrides,
  };
}

function llmPayload() {
  return {
    name: 'Linear',
    nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
    summary: '이슈 트래킹 도구',
    summaryAnchors: [{ sourceId: 's1', excerpt: '이슈 트래킹 도구입니다' }],
    categoryCandidates: [],
    features: [
      {
        name: '이슈 관리',
        summary: '이슈를 빠르게 관리',
        emoji: '✨',
        anchors: [{ sourceId: 's1', excerpt: '빠르게 이슈를 관리합니다' }],
      },
    ],
    tags: ['협업'],
    companyCandidate: null,
    alternativeCandidates: [],
    suggestedSlug: 'linear',
    warnings: [],
  };
}

describe('ProductResearchService.buildDraftValidator', () => {
  it('accepts a valid anchored payload', () => {
    const sources = [source()];
    const draft = ProductResearchService.buildDraftValidator({
      raw: llmPayload(),
      originalUrl: 'https://linear.app/',
      sources,
      categories: [],
      model: 'test-model',
      promptVersion: 'research-v1',
    });
    expect(draft.version).toBe(PRODUCT_RESEARCH_DRAFT_VERSION);
    expect(draft.identity.name.value).toBe('Linear');
    expect(draft.sourceSnapshotHash).toBe(hashSourceSnapshot(sources));
  });

  it('rejects fabricated excerpts', () => {
    expect(() =>
      ProductResearchService.buildDraftValidator({
        raw: { ...llmPayload(), nameAnchors: [{ sourceId: 's1', excerpt: '없는 문장' }] },
        originalUrl: 'https://linear.app/',
        sources: [source()],
        categories: [],
        model: 'test-model',
        promptVersion: 'research-v1',
      })
    ).toThrow();
  });
});

describe('ProductResearchService.requestResearch', () => {
  function requestDeps(existing: unknown = null, created: unknown = null) {
    return {
      findByRequestKey: vi.fn().mockResolvedValue(existing),
      createPendingJob: vi.fn().mockResolvedValue(created),
    };
  }

  it('returns the same job for the same requestId', async () => {
    const existing = { id: 'job-1', requestKey: 'req-12345678', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: requestDeps(existing, null),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const first = await service.requestResearch(
      { requestId: 'req-12345678', officialUrl: 'https://linear.app/' },
      // @ts-expect-error focused dependency shape
      deps
    );
    expect(first.job).toBe(existing);
    expect(first.queued).toBe(false);
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
  });

  it('creates a new job for a new requestId even with the same URL', async () => {
    const created = { id: 'job-2', requestKey: 'req-abcdef12', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: requestDeps(null, created),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      { requestId: 'req-abcdef12', officialUrl: 'https://linear.app/' },
      // @ts-expect-error focused dependency shape
      deps
    );
    expect(result.job).toBe(created);
    expect(result.queued).toBe(true);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: 'req-abcdef12',
      officialUrl: 'https://linear.app/',
    });
  });

  it('recovers a raced duplicate insert as deduped', async () => {
    const raced = { id: 'job-9', requestKey: 'req-raced-12', officialUrl: 'https://linear.app/' };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findByRequestKey: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(raced),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      { requestId: 'req-raced-12', officialUrl: 'https://linear.app/' },
      // @ts-expect-error focused dependency shape
      deps
    );
    expect(result.job).toBe(raced);
    expect(result.queued).toBe(false);
  });

  it('creates a new pending job for failed retry and keeps the terminal id different', async () => {
    const failed = { id: 'job-old', status: 'failed', officialUrl: 'https://linear.app/' };
    const created = { id: 'job-new', status: 'pending', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(failed),
        createPendingJob: vi.fn().mockResolvedValue(created),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.retryFailedResearch(
      'job-old',
      // @ts-expect-error focused dependency shape
      deps,
      'req-retry-99'
    );
    expect(result.job).toBe(created);
    expect(result.deduped).toBe(false);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: 'req-retry-99',
      officialUrl: 'https://linear.app/',
    });
  });

  it('returns the existing job as deduped when retry collides on request_key', async () => {
    const failed = { id: 'job-old', status: 'failed', officialUrl: 'https://linear.app/' };
    const raced = { id: 'job-existing', status: 'pending', officialUrl: 'https://linear.app/' };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(failed),
        findByRequestKey: vi.fn().mockResolvedValue(raced),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.retryFailedResearch(
      'job-old',
      // @ts-expect-error focused dependency shape
      deps,
      'req-collide-1'
    );
    expect(result.job).toBe(raced);
    expect(result.deduped).toBe(true);
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('req-collide-1');
  });

  it('rejects a retry request_key collision whose job URL differs from the failed job', async () => {
    const failed = { id: 'job-old', status: 'failed', officialUrl: 'https://linear.app/' };
    const raced = { id: 'job-existing', status: 'pending', officialUrl: 'https://notion.so/' };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(failed),
        findByRequestKey: vi.fn().mockResolvedValue(raced),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.retryFailedResearch(
        'job-old',
        // @ts-expect-error focused dependency shape
        deps,
        'req-collide-1'
      )
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('req-collide-1');
  });

  it('rejects a mismatched officialUrl for the same requestId without creating a job', async () => {
    const existing = { id: 'job-1', requestKey: 'req-12345678', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: requestDeps(existing, null),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.requestResearch(
        { requestId: 'req-12345678', officialUrl: 'https://notion.so/' },
        // @ts-expect-error focused dependency shape
        deps
      )
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('req-12345678');
  });

  it('rejects a mismatched officialUrl on a raced duplicate insert', async () => {
    const raced = { id: 'job-9', requestKey: 'req-raced-12', officialUrl: 'https://linear.app/' };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findByRequestKey: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(raced),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.requestResearch(
        { requestId: 'req-raced-12', officialUrl: 'https://notion.so/' },
        // @ts-expect-error focused dependency shape
        deps
      )
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
  });

  it('returns the terminal job as deduped when retry targets a non-failed job', async () => {
    const terminal = { id: 'job-done', status: 'completed', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(terminal),
        createPendingJob: vi.fn(),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.retryFailedResearch(
      'job-done',
      // @ts-expect-error focused dependency shape
      deps,
      'req-retry-99'
    );
    expect(result.job).toBe(terminal);
    expect(result.deduped).toBe(true);
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
  });

  it('rejects invalid request ids', async () => {
    const deps = {
      jobRepository: requestDeps(null, null),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.requestResearch(
        { requestId: 'bad id!', officialUrl: 'https://linear.app/' },
        // @ts-expect-error focused dependency shape
        deps
      )
    ).rejects.toThrow();
  });
});

describe('ProductResearchService.executeResearch', () => {
  function stableFixture(
    overrides: {
      searchResults?: Array<{ title: string; url: string; description: string; extraSnippets?: string[] }>;
      payload?: Record<string, unknown>;
    } = {}
  ) {
    const searchResults = overrides.searchResults ?? [
      { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
      { title: '외부 리뷰 A', url: 'https://a.example/review', description: 'Linear는 이슈 트래킹 도구입니다' },
      { title: '외부 리뷰 B', url: 'https://b.example/review', description: '빠르게 이슈를 관리합니다' },
    ];
    const payload = overrides.payload ?? {
      name: 'Linear',
      nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
      summary: '이슈 트래킹 도구',
      summaryAnchors: [{ sourceId: 's1', excerpt: '이슈 트래킹 도구입니다' }],
      categoryCandidates: [],
      features: [
        {
          name: '이슈 관리',
          summary: '이슈를 빠르게 관리',
          emoji: '✨',
          anchors: [{ sourceId: 's3', excerpt: '빠르게 이슈를 관리합니다' }],
        },
      ],
      tags: ['협업'],
      companyCandidate: null,
      alternativeCandidates: [],
      suggestedSlug: 'linear',
      warnings: [],
    };
    const sources = normalizeResearchSources(
      searchResults.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description,
        extraSnippets: result.extraSnippets ?? [],
      })),
      'linear.app'
    );
    const sourceById = new Map(sources.map(source => [source.id, source]));
    return { searchResults, payload, sources, sourceById };
  }

  function executeDeps(fixture: ReturnType<typeof stableFixture>, llmOverrides: Record<string, unknown> = {}) {
    return {
      jobRepository: {
        claimJob: vi.fn().mockResolvedValue({
          claimed: true,
          job: { id: 'job-1', officialUrl: 'https://linear.app/' },
        }),
        failJob: vi.fn().mockResolvedValue(null),
        completeJob: vi.fn().mockImplementation(async (input: { result: unknown }) => input.result),
      },
      categoryRepository: { findAll: vi.fn().mockResolvedValue([]) },
      searchClient: {
        search: vi.fn().mockImplementation(async () => ({ ok: true, results: fixture.searchResults })),
      },
      llm: {
        getModel: vi.fn().mockResolvedValue('test-model'),
        complete: vi.fn().mockResolvedValue(JSON.stringify(fixture.payload)),
        ...llmOverrides,
      },
    };
  }

  it('fails closed when search key is missing', async () => {
    const failJob = vi.fn().mockResolvedValue(null);
    const deps = {
      jobRepository: {
        claimJob: vi.fn().mockResolvedValue({
          claimed: true,
          job: { id: 'job-1', officialUrl: 'https://linear.app/' },
        }),
        failJob,
      },
      searchClient: { search: vi.fn().mockResolvedValue({ ok: false, code: 'NOT_CONFIGURED' }) },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    // @ts-expect-error dynamic import is avoided in this isolated dependency shape
    await service.executeResearch('job-1', deps, 'lease-1');
    expect(failJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', errorCode: 'SEARCH_NOT_CONFIGURED' })
    );
  });

  it('creates a stable draft from mock search and LLM fixtures with official host priority', async () => {
    const fixture = stableFixture();
    const official = fixture.sources.find(source => source.hostname === 'linear.app');
    expect(official?.relationToInput).toBe('INPUT_HOST_MATCH');
    expect(fixture.sources[0]?.relationToInput).toBe('INPUT_HOST_MATCH');
    const deps = executeDeps(fixture);
    const service = new ProductResearchService();
    // @ts-expect-error focused dependency shape
    const result = await service.executeResearch('job-1', deps, 'lease-1');
    expect(deps.jobRepository.completeJob).toHaveBeenCalledTimes(1);
    const completed = deps.jobRepository.completeJob.mock.calls[0]?.[0] as {
      result: { identity: { name: { value: string } }; warnings: string[] };
    };
    expect(completed.result.identity.name.value).toBe('Linear');
    expect(result).toMatchObject({ identity: { name: { value: 'Linear' } } });
  });

  it('rejects fabricated anchors and unknown source ids', async () => {
    const forged = stableFixture({
      payload: {
        name: 'Linear',
        nameAnchors: [{ sourceId: 's1', excerpt: '없는 문장' }],
        summary: '이슈 트래킹 도구',
        summaryAnchors: [{ sourceId: 's1', excerpt: '이슈 트래킹 도구입니다' }],
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      },
    });
    const forgedDeps = executeDeps(forged);
    const service = new ProductResearchService();
    // @ts-expect-error focused dependency shape
    await service.executeResearch('job-1', forgedDeps, 'lease-1');
    expect(forgedDeps.jobRepository.failJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', errorCode: 'INVALID_GENERATION' })
    );

    const unknown = stableFixture({
      payload: {
        name: 'Linear',
        nameAnchors: [{ sourceId: 's9', excerpt: 'Linear는 이슈' }],
        summary: null,
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      },
    });
    const unknownDeps = executeDeps(unknown);
    // @ts-expect-error focused dependency shape
    await service.executeResearch('job-1', unknownDeps, 'lease-1');
    expect(unknownDeps.jobRepository.failJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', errorCode: 'INVALID_GENERATION' })
    );
  });

  it('counts external independence by hostname and applies official host evidence', async () => {
    const sameHost = stableFixture({
      searchResults: [
        { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
        { title: '외부 A-1', url: 'https://a.example/one', description: '빠르게 이슈를 관리합니다' },
        { title: '외부 A-2', url: 'https://a.example/two', description: '빠르게 이슈를 관리합니다' },
      ],
      payload: {
        name: 'Linear',
        nameAnchors: [{ sourceId: 's2', excerpt: '빠르게 이슈를 관리합니다' }],
        summary: null,
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      },
    });
    const draft = ProductResearchService.buildDraftValidator({
      raw: sameHost.payload,
      originalUrl: 'https://linear.app/',
      sources: sameHost.sources,
      categories: [],
      model: 'test-model',
      promptVersion: 'research-v1',
    });
    expect(draft.identity.name.evidenceType).toBe('SINGLE_EXTERNAL');

    const official = stableFixture({
      payload: {
        name: 'Linear',
        nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
        summary: null,
        categoryCandidates: [],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      },
    });
    const officialDraft = ProductResearchService.buildDraftValidator({
      raw: official.payload,
      originalUrl: 'https://linear.app/',
      sources: official.sources,
      categories: [],
      model: 'test-model',
      promptVersion: 'research-v1',
    });
    expect(officialDraft.identity.name.evidenceType).toBe('INPUT_HOST');
  });

  it('does not block draft creation on an empty category catalog', async () => {
    const fixture = stableFixture({
      payload: {
        name: 'Linear',
        nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
        summary: null,
        categoryCandidates: [{ categoryId: 'cat-missing', reason: '후보' }],
        features: [],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      },
    });
    const deps = executeDeps(fixture);
    const service = new ProductResearchService();
    // @ts-expect-error focused dependency shape
    await service.executeResearch('job-1', deps, 'lease-1');
    expect(deps.jobRepository.completeJob).toHaveBeenCalledTimes(1);
  });

  it('ends with a typed failure for structured-output refusal', async () => {
    const fixture = stableFixture();
    const deps = executeDeps(fixture, {
      complete: vi.fn().mockRejectedValue(new Error('LLM structured completion was refused for model: x')),
    });
    const service = new ProductResearchService();
    // @ts-expect-error focused dependency shape
    await service.executeResearch('job-1', deps, 'lease-1');
    expect(deps.jobRepository.failJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', errorCode: 'LLM_STRUCTURED_OUTPUT_UNSUPPORTED' })
    );
  });

  it('ends with a typed failure when capability check reports unsupported', async () => {
    const fixture = stableFixture();
    const deps = executeDeps(fixture, { supportsStructuredOutput: vi.fn().mockResolvedValue(false) });
    const service = new ProductResearchService();
    // @ts-expect-error focused dependency shape
    await service.executeResearch('job-1', deps, 'lease-1');
    expect(deps.jobRepository.failJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', errorCode: 'LLM_STRUCTURED_OUTPUT_UNSUPPORTED' })
    );
    expect(deps.llm.complete).not.toHaveBeenCalled();
  });

  it('normalizes sources before LLM synthesis', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'A', url: 'https://linear.app/', description: 'plan' },
        { title: 'A dup', url: 'https://linear.app/#x', description: 'plan' },
      ],
      'linear.app'
    );
    expect(sources).toHaveLength(1);
  });
});
