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
