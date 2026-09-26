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
    items: [{ id: 'product:summary' as const, kind: 'product_summary' as const, text: '요약' }],
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

    vi.mocked(assembler.assemble).mockResolvedValue({
      evidence: mockEvidence,
      evidenceHash: 'hash-ev-1',
      baseDescriptionHash: 'hash-desc-1',
    });

    vi.mocked(generator.generate).mockResolvedValue({
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

    expect(assembler.assemble).toHaveBeenCalledTimes(2); // start and pre-return freshness check
    expect(generator.generate).toHaveBeenCalledWith(mockEvidence);
    expect(result.candidateHtml).toBe('<p>도입</p><p>마무리</p>');
    expect(result.evidenceHash).toBe('hash-ev-1');
    expect(result.baseDescriptionHash).toBe('hash-desc-1');
  });

  it('throws stale error if evidence or description changes during generation', async () => {
    const assembler = createMockAssembler();
    const generator = createMockGenerator();

    vi.mocked(assembler.assemble)
      .mockResolvedValueOnce({
        evidence: mockEvidence,
        evidenceHash: 'hash-ev-1',
        baseDescriptionHash: 'hash-desc-1',
      })
      .mockResolvedValueOnce({
        evidence: mockEvidence,
        evidenceHash: 'hash-ev-MODIFIED',
        baseDescriptionHash: 'hash-desc-1',
      });

    vi.mocked(generator.generate).mockResolvedValue({
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
});
