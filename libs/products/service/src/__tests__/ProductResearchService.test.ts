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
  it('같은 hostname의 다른 제품 경로는 서버 경고를 만들고 외부 근거를 독립 검증으로 승격하지 않는다', () => {
    const draft = ProductResearchService.buildDraftValidator({
      raw: {
        name: 'Suite',
        nameAnchors: [
          { sourceId: 's1', excerpt: '제품' },
          { sourceId: 's2', excerpt: '제품' },
        ],
        features: [],
      },
      originalUrl: 'https://input.example/tool',
      sources: [
        source({
          id: 's1',
          hostname: 'suite.example',
          url: 'https://suite.example/tool/a',
          snippet: '제품',
          relationToInput: 'EXTERNAL',
        }),
        source({
          id: 's2',
          hostname: 'suite.example',
          url: 'https://suite.example/tool/b',
          snippet: '제품',
          relationToInput: 'EXTERNAL',
        }),
        source({
          id: 's3',
          hostname: 'input.example',
          url: 'https://input.example/another-tool',
          snippet: '다른 제품',
        }),
      ],
      categories: [],
      model: 'test',
      promptVersion: 'research-v1',
    });
    expect(draft.identity.name.evidenceType).toBe('SINGLE_EXTERNAL');
    expect(draft.warnings).toContain('AMBIGUOUS_PRODUCT');
    expect(draft.warnings).toContain('SPARSE_FACTS');
    expect(draft.summary).toBeNull();
  });

  it('wire schema의 nullable sparse 응답과 검증기가 같은 anchor 계약을 따른다', () => {
    const schema = ProductResearchService.researchResponseFormat().json_schema.schema;
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.properties.summary.type).toEqual(['string', 'null']);
    expect(schema.properties.companyCandidate.type).toEqual(['object', 'null']);
    const raw = {
      name: 'Linear',
      nameAnchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }],
      summary: null,
      summaryAnchors: [],
      categoryCandidates: [],
      features: [],
      tags: [],
      companyCandidate: null,
      alternativeCandidates: [],
      suggestedSlug: 'linear',
      warnings: [],
    };
    const input = {
      raw,
      originalUrl: 'https://linear.app/',
      sources: [source()],
      categories: [],
      model: 'test',
      promptVersion: 'research-v1',
    };
    expect(ProductResearchService.buildDraftValidator(input)).toMatchObject({
      summary: null,
      features: [],
      warnings: ['SPARSE_FACTS'],
    });
    expect(() => ProductResearchService.buildDraftValidator({ ...input, raw: { ...raw, summary: '설명' } })).toThrow(
      '근거'
    );
    expect(() => ProductResearchService.buildDraftValidator({ ...input, raw: { ...raw, nameAnchors: [] } })).toThrow(
      '근거'
    );
  });
  it.each([
    { summary: 42 },
    { categoryCandidates: {} },
    { tags: '협업' },
    { warnings: ['VERIFIED_OFFICIAL'] },
    { extraFacts: 'unsupported' },
    { features: [{ ...llmPayload().features[0], emoji: 'x'.repeat(31) }] },
    { alternativeCandidates: null },
    { alternativeCandidates: [null] },
    { nameAnchors: Array.from({ length: 6 }, () => ({ sourceId: 's1', excerpt: 'Linear는 이슈' })) },
    { features: [{ ...llmPayload().features[0], unsupported: true }] },
    { companyCandidate: { name: 'Linear', website: 12, anchors: [{ sourceId: 's1', excerpt: 'Linear는 이슈' }] } },
    { categoryCandidates: [{ reason: '후보' }] },
  ])('schema 밖의 wire 값은 sparse 성공으로 숨기지 않고 거절한다: %j', changes => {
    expect(() =>
      ProductResearchService.buildDraftValidator({
        raw: { ...llmPayload(), ...changes },
        originalUrl: 'https://linear.app/',
        sources: [source()],
        categories: [],
        model: 'test',
        promptVersion: 'research-v1',
      })
    ).toThrow();
  });
});

describe('ProductResearchService.requestResearch', () => {
  function requestDeps(existing: { requestKey: string } | null = null, created: unknown = null) {
    return {
      findByRequestKey: vi.fn(async (requestKey: string) => (existing?.requestKey === requestKey ? existing : null)),
      createPendingJob: vi.fn().mockResolvedValue(created),
    };
  }

  it('returns the same job for the same requestId', async () => {
    const existing = {
      id: 'job-1',
      requestKey: 'request:e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c',
      officialUrl: 'https://linear.app/',
    };
    const deps = {
      jobRepository: requestDeps(existing, null),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const first = await service.requestResearch(
      { requestId: 'e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c', officialUrl: 'https://linear.app/' },
      // @ts-expect-error focused dependency shape
      deps
    );
    expect(first.job).toBe(existing);
    expect(first.queued).toBe(false);
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('request:e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c');
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
  });

  it('creates a new job for a new requestId even with the same URL', async () => {
    const created = {
      id: 'job-2',
      requestKey: 'request:f1e2d3c4b5a44127890abcdef1234567',
      officialUrl: 'https://linear.app/',
    };
    const existing = {
      ...created,
      id: 'job-1',
      requestKey: 'request:e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c',
    };
    const deps = {
      jobRepository: requestDeps(existing, created),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      { requestId: 'f1e2d3c4b5a44127890abcdef1234567', officialUrl: 'https://linear.app/' },
      // @ts-expect-error focused dependency shape
      deps
    );
    expect(result.job).toBe(created);
    expect(result.queued).toBe(true);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: 'request:f1e2d3c4b5a44127890abcdef1234567',
      officialUrl: 'https://linear.app/',
    });
  });

  it('recovers a raced duplicate insert as deduped', async () => {
    const raced = {
      id: 'job-9',
      requestKey: 'request:aa11bb22cc334d5599aa11bb22cc3344',
      officialUrl: 'https://linear.app/',
    };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findByRequestKey: requestDeps(raced).findByRequestKey.mockResolvedValueOnce(null),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const result = await service.requestResearch(
      { requestId: 'aa11bb22cc334d5599aa11bb22cc3344', officialUrl: 'https://linear.app/' },
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
      '1234567812344abc9012345678abcdef'
    );
    expect(result.job).toBe(created);
    expect(result.deduped).toBe(false);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: 'request:1234567812344abc9012345678abcdef',
      officialUrl: 'https://linear.app/',
      retryOfJobId: 'job-old',
    });
  });

  it('returns the existing job as deduped when retry collides on request_key', async () => {
    const failed = { id: 'job-old', status: 'failed', officialUrl: 'https://linear.app/' };
    const raced = {
      id: 'job-existing',
      requestKey: 'request:feedfacebeef4d5e8021c0ffee123456',
      status: 'pending',
      officialUrl: 'https://linear.app/',
    };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(failed),
        findByRequestKey: requestDeps(raced).findByRequestKey,
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
      'feedfacebeef4d5e8021c0ffee123456'
    );
    expect(result.job).toBe(raced);
    expect(result.deduped).toBe(true);
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('request:feedfacebeef4d5e8021c0ffee123456');
  });

  it('rejects a retry request_key collision whose job URL differs from the failed job', async () => {
    const failed = { id: 'job-old', status: 'failed', officialUrl: 'https://linear.app/' };
    const raced = {
      id: 'job-existing',
      requestKey: 'request:feedfacebeef4d5e8021c0ffee123456',
      status: 'pending',
      officialUrl: 'https://notion.so/',
    };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findById: vi.fn().mockResolvedValue(failed),
        findByRequestKey: requestDeps(raced).findByRequestKey,
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
        'feedfacebeef4d5e8021c0ffee123456'
      )
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_CONFLICT' });
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('request:feedfacebeef4d5e8021c0ffee123456');
  });

  it('rejects a mismatched officialUrl for the same requestId without creating a job', async () => {
    const existing = {
      id: 'job-1',
      requestKey: 'request:e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c',
      officialUrl: 'https://linear.app/',
    };
    const deps = {
      jobRepository: requestDeps(existing, null),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.requestResearch(
        { requestId: 'e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c', officialUrl: 'https://notion.so/' },
        // @ts-expect-error focused dependency shape
        deps
      )
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_CONFLICT' });
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
    expect(deps.jobRepository.findByRequestKey).toHaveBeenCalledWith('request:e7f8a1b2c3d4412a9b0c1d2e3f4a5b6c');
  });

  it('rejects a mismatched officialUrl on a raced duplicate insert', async () => {
    const raced = {
      id: 'job-9',
      requestKey: 'request:aa11bb22cc334d5599aa11bb22cc3344',
      officialUrl: 'https://linear.app/',
    };
    const confinedError = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const deps = {
      jobRepository: {
        findByRequestKey: requestDeps(raced).findByRequestKey.mockResolvedValueOnce(null),
        createPendingJob: vi.fn().mockRejectedValueOnce(confinedError),
      },
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    await expect(
      service.requestResearch(
        { requestId: 'aa11bb22cc334d5599aa11bb22cc3344', officialUrl: 'https://notion.so/' },
        // @ts-expect-error focused dependency shape
        deps
      )
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_CONFLICT' });
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
      '1234567812344abc9012345678abcdef'
    );
    expect(result.job).toBe(terminal);
    expect(result.deduped).toBe(true);
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
  });

  it('표준 UUID v4를 request 네임스페이스에 저장하고 누락된 ID는 거절한다', async () => {
    const deps = {
      jobRepository: requestDeps(null, { id: 'new' }),
      searchClient: { search: vi.fn() },
      llm: { getModel: vi.fn(), complete: vi.fn() },
    };
    const service = new ProductResearchService();
    const requestId = 'a2f7c964-582e-4971-932e-9ae7e8c4b107';
    // @ts-expect-error focused dependency shape
    await service.requestResearch({ requestId, officialUrl: 'https://example.com:8443/tool' }, deps);
    expect(deps.jobRepository.createPendingJob).toHaveBeenCalledWith({
      requestKey: `request:${requestId}`,
      officialUrl: 'https://example.com:8443/tool',
    });
    // @ts-expect-error intentionally missing required requestId
    await expect(service.requestResearch({ officialUrl: 'https://example.com/tool' }, deps)).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
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
    expect(deps.jobRepository.createPendingJob).not.toHaveBeenCalled();
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
        retryJobLease: vi.fn().mockResolvedValue(null),
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

  it('질의별 rank를 round-robin으로 합친 뒤 URL 중복 제거와 최대 15개를 적용한다', async () => {
    const fixture = stableFixture({
      payload: { name: '제품', nameAnchors: [{ sourceId: 's1', excerpt: '공통 근거' }], features: [] },
    });
    const deps = executeDeps(fixture);
    let query = 0;
    deps.searchClient.search.mockImplementation(async () => {
      const index = query++;
      return {
        ok: true,
        results: Array.from({ length: 5 }, (_, rank) => ({
          title: `q${index}r${rank}`,
          url:
            rank === 1 ? 'https://duplicate.example/path#fragment' : `https://q${index}.example:8443/product/${rank}`,
          description: '공통 근거',
        })),
      };
    });
    // @ts-expect-error focused dependency shape
    await new ProductResearchService().executeResearch('job-1', deps, 'lease-1');
    const calls = deps.llm.complete.mock.calls as unknown as Array<[string, string]>;
    const input = JSON.parse(calls[0]![1].split('\n반드시')[0]!);
    expect(input.sources.map((item: { url: string }) => item.url)).toEqual([
      'https://q0.example:8443/product/0',
      'https://q1.example:8443/product/0',
      'https://q2.example:8443/product/0',
      'https://q3.example:8443/product/0',
      'https://q4.example:8443/product/0',
      'https://duplicate.example/path',
      'https://q0.example:8443/product/2',
      'https://q1.example:8443/product/2',
      'https://q2.example:8443/product/2',
      'https://q3.example:8443/product/2',
      'https://q4.example:8443/product/2',
      'https://q0.example:8443/product/3',
      'https://q1.example:8443/product/3',
      'https://q2.example:8443/product/3',
      'https://q3.example:8443/product/3',
    ]);
    expect(deps.jobRepository.completeJob).toHaveBeenCalledOnce();
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
