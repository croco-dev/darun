import { mockedMethods } from '@darun/utils-vitest-config/testing';
import { describe, expect, it, vi } from 'vitest';
import type { IProductDescriptionEvidenceAssembler } from '../services/ProductDescriptionEvidenceAssembler';
import type { ProductDescriptionGenerator } from '../services/ProductDescriptionGenerator';
import { GenerateProductDescriptionCandidate } from '../usecases/GenerateProductDescription';

function createMockAssembler(): IProductDescriptionEvidenceAssembler {
  return { assemble: vi.fn() };
}

function createMockGenerator(): ProductDescriptionGenerator {
  return { generate: vi.fn() };
}

describe('GenerateProductDescriptionCandidate', () => {
  const mockEvidence = {
    productId: 'prod-1',
    productName: '테스트',
    items: [
      {
        id: 'product:summary' as const,
        kind: 'product_summary' as const,
        text: '요약',
      },
    ],
  };

  const mockDoc = {
    intro: { text: '도입', evidenceRefs: ['product:summary'] },
    sections: [],
    recommendedIf: [],
    limitations: [] as [],
    closing: { text: '마무리', evidenceRefs: ['product:summary'] },
  };

  it('generates candidate without modifying canonical product', async () => {
    const assembler = createMockAssembler();
    const generator = createMockGenerator();

    mockedMethods(assembler).assemble.mockResolvedValue({
      evidence: mockEvidence,
      evidenceHash: 'hash-ev-1',
      evidenceHashVersion: 'v2',
      legacyEvidenceHash: 'legacy-1',
      baseDescriptionHash: 'hash-desc-1',
    });

    mockedMethods(generator).generate.mockResolvedValue({
      document: mockDoc,
      candidateHtml: '<p>도입</p><p>마무리</p>',
      writerModel: 'test-model',
      reviewerModel: 'test-model',
      writerPromptVersion: 'v1',
      reviewerPromptVersion: 'v1',
      rendererVersion: 'v1',
    });

    const usecase = new GenerateProductDescriptionCandidate(assembler, generator);
    const result = await usecase.execute({ productId: 'prod-1' });

    expect(mockedMethods(assembler).assemble).toHaveBeenCalledTimes(2); // start and pre-return freshness check
    expect(mockedMethods(generator).generate).toHaveBeenCalledWith(mockEvidence, undefined);
    expect(result.candidateHtml).toBe('<p>도입</p><p>마무리</p>');
    expect(result.evidenceHash).toBe('hash-ev-1');
    expect(result.baseDescriptionHash).toBe('hash-desc-1');
  });

  it('throws stale error if evidence or description changes during generation', async () => {
    const assembler = createMockAssembler();
    const generator = createMockGenerator();

    mockedMethods(assembler)
      .assemble.mockResolvedValueOnce({
        evidence: mockEvidence,
        evidenceHash: 'hash-ev-1',
        evidenceHashVersion: 'v2',
        legacyEvidenceHash: 'legacy-1',
        baseDescriptionHash: 'hash-desc-1',
      })
      .mockResolvedValueOnce({
        evidence: mockEvidence,
        evidenceHash: 'hash-ev-MODIFIED',
        evidenceHashVersion: 'v2',
        legacyEvidenceHash: 'legacy-2',
        baseDescriptionHash: 'hash-desc-1',
      });

    mockedMethods(generator).generate.mockResolvedValue({
      document: mockDoc,
      candidateHtml: '<p>도입</p>',
      writerModel: 'test-model',
      reviewerModel: 'test-model',
      writerPromptVersion: 'v1',
      reviewerPromptVersion: 'v1',
      rendererVersion: 'v1',
    });

    const usecase = new GenerateProductDescriptionCandidate(assembler, generator);
    await expect(usecase.execute({ productId: 'prod-1' })).rejects.toThrow('stale:');
  });

  it('keeps the exact editor-authored condition outside the model input across regenerations', async () => {
    const assembler = createMockAssembler();
    const generator = createMockGenerator();
    const snapshot = {
      evidence: mockEvidence,
      evidenceHashVersion: 'v2' as const,
      evidenceHash: 'evidence',
      legacyEvidenceHash: 'legacy',
      baseDescriptionHash: 'base',
      usageConditions: {
        version: 1 as const,
        revision: 'revision-1',
        editorId: 'editor-1',
        items: [
          {
            statement: 'iOS 18 이상 <테스트> & 팀 계정',
            sourceUrl: 'https://example.com/guide?a=1&b=2',
            excerpt: '관리자 참고용 발췌',
            checkedOn: '2026-11-28',
          },
        ],
      },
    };
    vi.mocked(assembler.assemble).mockResolvedValue(snapshot);
    const modelCandidate = {
      document: mockDoc,
      candidateHtml: '<p>첫 생성 결과</p>',
      writerModel: 'writer',
      reviewerModel: 'reviewer',
      writerPromptVersion: 'v1',
      reviewerPromptVersion: 'v1',
      rendererVersion: 'v1',
    };
    vi.mocked(generator.generate)
      .mockResolvedValueOnce(modelCandidate)
      .mockResolvedValueOnce({
        ...modelCandidate,
        candidateHtml: '<p>두 번째 생성 결과</p>',
      });

    const usecase = new GenerateProductDescriptionCandidate(assembler, generator);
    const first = await usecase.execute({ productId: 'prod-1' });
    const second = await usecase.execute({ productId: 'prod-1' });

    expect(first.candidateHtml).toContain('iOS 18 이상 &lt;테스트&gt; &amp; 팀 계정');
    expect(second.candidateHtml.replace('<p>두 번째 생성 결과</p>', '<p>첫 생성 결과</p>')).toBe(first.candidateHtml);
    expect(first.candidateHtml).toContain('https://example.com/guide?a=1&amp;b=2');
    expect(first.candidateHtml).not.toContain(snapshot.usageConditions.items[0].excerpt);
    expect(first.candidateDocument.limitations).toEqual([]);
    expect(vi.mocked(generator.generate).mock.calls).toEqual([
      [mockEvidence, undefined],
      [mockEvidence, undefined],
    ]);
  });
});
