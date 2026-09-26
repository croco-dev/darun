import 'reflect-metadata';
import type { ProductDescriptionEvidence } from '@darun/products-domain';
import { LlmClient } from '@darun/utils-llm';
import { describe, expect, it, vi } from 'vitest';
import {
  PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
  PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
} from '../prompts/productDescriptionPrompt';
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
    { id: 'product:summary', kind: 'product_summary', text: '팀 업무 흐름 협업 도구' },
    { id: 'category:cat-1', kind: 'category', text: '협업' },
    { id: 'feature:feat-1', kind: 'feature', title: '보드 자동화', text: '자동화 규칙 지원' },
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

    // Both calls used the pinned model 'google/gemini-2.5-flash'
    expect(llmClient.completion.mock.calls[0]?.[0]).toBe('google/gemini-2.5-flash');
    expect(llmClient.completion.mock.calls[1]?.[0]).toBe('google/gemini-2.5-flash');

    // Result document matches reviewer output
    expect(result.document).toEqual(validReviewedDoc);
    expect(result.candidateHtml).toContain('<p>Flowdesk는 팀 업무 흐름을 정리하는 협업 도구입니다.</p>');
    expect(result.writerModel).toBe('google/gemini-2.5-flash');
    expect(result.reviewerModel).toBe('google/gemini-2.5-flash');
    expect(result.writerPromptVersion).toBe(PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION);
    expect(result.reviewerPromptVersion).toBe(PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION);
    expect(result.rendererVersion).toBeDefined();

    // Verify reviewer received the writer's draft in user prompt
    const reviewerUserPrompt = (llmClient.completion.mock.calls[1]?.[1] as Array<{ role: string; content: string }>)[1]
      ?.content;
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
});
