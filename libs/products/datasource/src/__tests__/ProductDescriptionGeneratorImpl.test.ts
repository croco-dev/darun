import 'reflect-metadata';
import {
  ApplyProductDescriptionCandidate,
  GenerateProductDescriptionCandidate,
  Product,
  type ProductDescriptionApplySession,
  type ProductDescriptionEvidence,
  type ProductDescriptionJobEntity,
} from '@darun/products-domain';
import { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import {
  PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
  PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
} from '../prompts/productDescriptionPrompt';
import { createProductDescriptionResponseFormat } from '../prompts/productDescriptionSchema';
import { parseStrictJson, ProductDescriptionGeneratorImpl } from '../services/ProductDescriptionGeneratorImpl';

class FakeLlmClient extends LlmClient {
  public readonly completion = vi.fn<LlmClient['completion']>();
  public readonly getConfig = vi.fn<LlmClient['getConfig']>().mockResolvedValue({
    endpoint: 'https://openrouter.ai/api/v1',
    apiKey: 'test-key',
    model: 'google/gemini-2.5-flash',
    thinkingLevel: 'low',
  });
}

const mockEvidence: ProductDescriptionEvidence = {
  productId: 'prod-1',
  productName: 'Flowdesk',
  items: [
    {
      id: 'product:summary',
      kind: 'product_summary',
      text: '팀 업무 흐름 협업 도구',
    },
    { id: 'category:cat-1', kind: 'category', text: '협업' },
    {
      id: 'feature:feat-1',
      kind: 'feature',
      title: '보드 자동화',
      text: '자동화 규칙 지원',
    },
  ],
};

const validWriterDoc = {
  intro: {
    text: 'Flowdesk는 팀 업무 흐름을 정리하는 협업 도구입니다.',
    evidenceRefs: ['product:summary'],
  },
  sections: [
    {
      title: '자동화 규칙',
      paragraphs: [
        {
          text: '보드 자동화 규칙을 통해 반복 작업을 줄입니다.',
          evidenceRefs: ['feature:feat-1'],
        },
      ],
    },
  ],
  recommendedIf: [
    {
      text: '업무 자동화가 필요한 팀에게 유용합니다.',
      evidenceRefs: ['feature:feat-1'],
    },
  ],
  limitations: [],
  closing: {
    text: '협업 효율을 높이는 도구입니다.',
    evidenceRefs: ['product:summary'],
  },
};

const validReviewedDoc = {
  ...validWriterDoc,
  closing: {
    text: '정돈된 협업 효율을 돕는 도구입니다.',
    evidenceRefs: ['product:summary'],
  },
};

describe('ProductDescriptionGeneratorImpl', () => {
  it('검수한 추천 하위 목록을 v3 후보로 생성하고 적용에 같은 HTML을 전달한다', async () => {
    const llmClient = new FakeLlmClient();
    const reviewedDoc = {
      ...validReviewedDoc,
      recommendedIf: [{ ...validReviewedDoc.recommendedIf[0], bullets: ['PDF로 공유합니다.', '팀별로 분류합니다.'] }],
    };
    llmClient.completion
      .mockResolvedValueOnce({ role: 'assistant', content: JSON.stringify(validWriterDoc), refusal: null })
      .mockResolvedValueOnce({ role: 'assistant', content: JSON.stringify(reviewedDoc), refusal: null });
    const snapshot = {
      evidence: mockEvidence,
      evidenceHashVersion: 'v2' as const,
      evidenceHash: 'evidence',
      legacyEvidenceHash: 'legacy',
      baseDescriptionHash: 'base',
    };
    const generated = await new GenerateProductDescriptionCandidate(
      { assemble: vi.fn().mockResolvedValue(snapshot) },
      new ProductDescriptionGeneratorImpl(llmClient)
    ).execute({ productId: 'prod-1' });

    expect(generated.candidateDocument.recommendedIf[0]?.bullets).toEqual(['PDF로 공유합니다.', '팀별로 분류합니다.']);
    expect(generated.candidateHtml).toContain(
      '<li>업무 자동화가 필요한 팀에게 유용합니다.<ul><li>PDF로 공유합니다.</li><li>팀별로 분류합니다.</li></ul></li>'
    );
    expect(generated.rendererVersion).toBe('v3');

    const product = new Product({
      id: 'prod-1',
      name: 'Flowdesk',
      slug: 'flowdesk',
      summary: '협업 도구',
      logoUrl: 'https://example.com/logo.png',
      description: '<p>기존 소개</p>',
    });
    const job: ProductDescriptionJobEntity = {
      ...generated,
      candidateDocument: JSON.stringify(generated.candidateDocument),
      id: 'job-1',
      productId: product.id,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const session: ProductDescriptionApplySession = {
      findJob: vi.fn().mockResolvedValue(job),
      findLockedProduct: vi.fn().mockResolvedValue(product),
      assembleLocked: vi.fn().mockResolvedValue(snapshot),
      applyLocked: vi.fn().mockResolvedValue(product),
      markAppliedLocked: vi.fn().mockResolvedValue({ ...job, appliedAt: new Date() }),
    };
    await new ApplyProductDescriptionCandidate({ transaction: { run: async work => work(session) } }).execute({
      jobId: job.id,
    });
    expect(session.applyLocked).toHaveBeenCalledWith({ productId: product.id, candidateHtml: generated.candidateHtml });
  });

  it('runs 2-pass writer and reviewer with pinned model and returns validated result', async () => {
    const llmClient = new FakeLlmClient();

    // Call 1: Writer returns validWriterDoc
    // Call 2: Reviewer returns validReviewedDoc
    llmClient.completion
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(validWriterDoc),
        refusal: null,
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(validReviewedDoc),
        refusal: null,
      });

    const generator = new ProductDescriptionGeneratorImpl(llmClient);
    const result = await generator.generate(mockEvidence);

    expect(llmClient.getConfig).toHaveBeenCalledTimes(1);
    expect(llmClient.completion).toHaveBeenCalledTimes(2);
    for (const call of llmClient.completion.mock.calls) {
      expect(call[2]).toEqual(
        expect.objectContaining({
          thinkingLevel: 'low',
          responseFormat: createProductDescriptionResponseFormat(mockEvidence),
        })
      );
      // stage wall-clock budget의 AbortSignal이 HTTP 계층까지 전파된다.
      expect(call[2]).toHaveProperty('signal');
      expect((call[2] as { signal?: unknown }).signal).toBeInstanceOf(AbortSignal);
    }

    // Both calls used the pinned model 'google/gemini-2.5-flash'
    expect(llmClient.completion.mock.calls[0]?.[0]).toBe('google/gemini-2.5-flash');
    expect(llmClient.completion.mock.calls[1]?.[0]).toBe('google/gemini-2.5-flash');

    // Result document matches reviewer output
    expect(result.document).toMatchObject(validReviewedDoc);
    expect(result.candidateHtml).toContain('<p>Flowdesk는 팀 업무 흐름을 정리하는 협업 도구입니다.</p>');
    expect(result.writerModel).toBe('google/gemini-2.5-flash');
    expect(result.reviewerModel).toBe('google/gemini-2.5-flash');
    expect(result.writerPromptVersion).toBe(PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION);
    expect(result.reviewerPromptVersion).toBe(PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION);
    expect(result.rendererVersion).toBeDefined();

    // Verify reviewer received the writer's draft in user prompt
    const reviewerUserPrompt = (
      llmClient.completion.mock.calls[1]?.[1] as Array<{
        role: string;
        content: string;
      }>
    )[1]?.content;
    expect(reviewerUserPrompt).toContain('Flowdesk는 팀 업무 흐름을 정리하는 협업 도구입니다.');
  });

  it('rejects markdown code fences in fail-closed parseStrictJson', () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(validWriterDoc)}\n\`\`\``;
    expect(() => parseStrictJson(wrapped)).toThrow('마크다운 코드 블록이 포함되어 있어');
  });

  it('fails if writer produces invalid document shape', async () => {
    const llmClient = new FakeLlmClient();
    llmClient.completion.mockResolvedValueOnce({
      role: 'assistant',
      content: JSON.stringify({ invalid: 'shape' }),
      refusal: null,
    });

    const generator = new ProductDescriptionGeneratorImpl(llmClient);
    await expect(generator.generate(mockEvidence)).rejects.toThrow();
    // Reviewer must NOT be called if writer fails
    expect(llmClient.completion).toHaveBeenCalledTimes(1);
  });

  it('fails if reviewer produces invalid document shape', async () => {
    const llmClient = new FakeLlmClient();
    llmClient.completion
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(validWriterDoc),
        refusal: null,
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify({ limitations: [{ text: '단점' }] }),
        refusal: null,
      });

    const generator = new ProductDescriptionGeneratorImpl(llmClient);
    await expect(generator.generate(mockEvidence)).rejects.toThrow();
    expect(llmClient.completion).toHaveBeenCalledTimes(2);
  });
  it('accepts sparse reviewer output without forced feature coverage or recommendations', async () => {
    const llmClient = new FakeLlmClient();
    llmClient.completion
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(validWriterDoc),
        refusal: null,
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify({
          ...validReviewedDoc,
          sections: [],
          recommendedIf: [],
        }),
        refusal: null,
      });
    const result = await new ProductDescriptionGeneratorImpl(llmClient).generate(mockEvidence);
    expect(result.document.sections).toEqual([]);
    expect(result.document.recommendedIf).toEqual([]);
  });

  it('lets the reviewer fill missing feature coverage in a structurally valid draft', async () => {
    const llmClient = new FakeLlmClient();
    llmClient.completion
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify({
          ...validWriterDoc,
          sections: [],
          recommendedIf: [],
        }),
        refusal: null,
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: JSON.stringify(validReviewedDoc),
        refusal: null,
      });
    const result = await new ProductDescriptionGeneratorImpl(llmClient).generate(mockEvidence);
    expect(result.document.sections).toHaveLength(1);
  });
});
