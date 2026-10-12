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

describe('ProductResearchService.executeResearch', () => {
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

  it('reaches claim, search, and LLM fakes on failed-research retry', async () => {
    const claimJob = vi.fn().mockResolvedValue({
      claimed: true,
      job: { id: 'job-9', officialUrl: 'https://linear.app/' },
    });
    const search = vi.fn().mockResolvedValue({
      ok: true,
      results: [
        { title: 'Linear 공식', url: 'https://linear.app/', description: 'Linear는 이슈 트래킹 도구입니다' },
        { title: 'Linear 기능', url: 'https://linear.app/features', description: '빠르게 이슈를 관리합니다' },
        { title: 'Linear 소개', url: 'https://linear.app/about', description: '협업 도구 Linear입니다' },
      ],
    });
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({
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
            anchors: [{ sourceId: 's2', excerpt: '빠르게 이슈를 관리합니다' }],
          },
        ],
        tags: [],
        companyCandidate: null,
        alternativeCandidates: [],
        suggestedSlug: 'linear',
        warnings: [],
      })
    );
    const completeJob = vi.fn().mockResolvedValue(null);
    const service = new ProductResearchService();
    await service.executeResearch(
      'job-9',
      {
        jobRepository: { claimJob, completeJob, failJob: vi.fn() },
        searchClient: { search },
        llm: { getModel: vi.fn().mockResolvedValue('fake-model'), complete },
      } as never,
      '11111111-1111-4111-8111-111111111111'
    );
    expect(claimJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-9', leaseToken: '11111111-1111-4111-8111-111111111111' })
    );
    expect(search).toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
    expect(completeJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-9', leaseToken: '11111111-1111-4111-8111-111111111111' })
    );
  });

  it('W6-A1: manual re-request with a new requestId creates a new logical job', async () => {
    const created = { id: 'job-2', requestKey: 'req:abcdef12', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: {
        findByRequestKey: vi.fn().mockResolvedValue(null),
        createPendingJob: vi.fn().mockResolvedValue(created),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      'https://linear.app/',
      // @ts-expect-error focused dependency shape
      deps,
      'abcdef12'
    );
    expect(result.job).toBe(created);
    expect(result.queued).toBe(true);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: 'req:abcdef12',
      officialUrl: 'https://linear.app/',
    });
  });

  it('W6-A1: same request-id retransmit returns the single existing job', async () => {
    const existing = { id: 'job-1', requestKey: 'req:abcdef12', officialUrl: 'https://linear.app/' };
    const deps = {
      jobRepository: {
        findByRequestKey: vi.fn().mockResolvedValue(existing),
        createPendingJob: vi.fn(),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      'https://linear.app/',
      // @ts-expect-error focused dependency shape
      deps,
      'abcdef12'
    );
    expect(result.job).toBe(existing);
    expect(result.queued).toBe(false);
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
  });

  it('W6-A1: retry of a failed job creates a new pending job preserving the failed one', async () => {
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
      'retry-9999'
    );
    expect(result.job).toBe(created);
    expect(result.deduped).toBe(false);
    expect(result.job.id).not.toBe('job-old');
  });

  it('W6-A2: same-host different-identity sources are never verified-official', () => {
    const sources = [
      source({ id: 's1', url: 'https://linear.app/', hostname: 'linear.app' }),
      source({
        id: 's2',
        title: 'Linear 하위 도메인',
        url: 'https://docs.linear.app/features',
        hostname: 'docs.linear.app',
        snippet: '빠르게 이슈를 관리합니다',
        extraSnippets: [],
        relationToInput: 'INPUT_HOST_MATCH',
      }),
    ];
    const draft = ProductResearchService.buildDraftValidator({
      raw: {
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
      originalUrl: 'https://linear.app/',
      sources,
      categories: [],
      model: 'test-model',
      promptVersion: 'research-v1',
    });
    expect(draft.identity.name.evidenceType).not.toBe('INPUT_HOST');
    // Same-host different-identity is neither verified-official nor
    // independent external corroboration: it must not read as INPUT_HOST.
    expect(draft.identity.name.evidenceType).toBe('NONE');
  });

  it('W6-A2: research output carries the single validator contract shape', () => {
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
    expect(draft.identity.name.evidenceType).toBe('INPUT_HOST');
    expect(Array.isArray(draft.categoryCandidates)).toBe(true);
    expect(draft.companyCandidate).toBeNull();
    expect(Array.isArray(draft.alternativeCandidates)).toBe(true);
    expect(draft.sourceSnapshotHash).toBe(hashSourceSnapshot(sources));
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
