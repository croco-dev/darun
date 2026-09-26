import {
  type ProductDescriptionEvidence,
  type ProductDescriptionGenerationResult,
  type ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '@darun/products-domain';
import { LlmClient, withRetry, withTimeout } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import {
  PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
  PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
  createProductDescriptionReviewerPrompt,
  createProductDescriptionWriterPrompt,
} from '../prompts/productDescriptionPrompt';
import { validateProductDescriptionDocument } from '../validators/productDescriptionDocumentValidator';
import { PRODUCT_DESCRIPTION_RENDERER_VERSION, renderProductDescriptionDocument } from './ProductDescriptionRenderer';

const CALL_TIMEOUT_MS = 25_000;

export function parseStrictJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```') || trimmed.endsWith('```')) {
    throw new Error('LLM 응답에 마크다운 코드 블록이 포함되어 있어 파싱할 수 없습니다.');
  }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('LLM 응답이 JSON 객체 형식이 아닙니다.');
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
}

@Service({ id: ProductDescriptionGeneratorToken })
@Service()
export class ProductDescriptionGeneratorImpl implements ProductDescriptionGenerator {
  constructor(@Inject(() => LlmClient) private readonly llmClient: LlmClient) {}

  async generate(
    evidence: ProductDescriptionEvidence,
    options?: { model?: string }
  ): Promise<ProductDescriptionGenerationResult> {
    const config = await this.llmClient.getConfig();
    const model = options?.model ?? config.model;
    const thinkingLevel = config.thinkingLevel;

    // 1. Pass 1: Writer
    const writerPrompts = createProductDescriptionWriterPrompt(evidence);
    const writerResponse = await withRetry(
      () =>
        withTimeout(
          this.llmClient.completion(
            model,
            [
              { role: 'system', content: writerPrompts.systemPrompt },
              { role: 'user', content: writerPrompts.userPrompt },
            ],
            { thinkingLevel }
          ),
          CALL_TIMEOUT_MS,
          '상품 설명 초안 생성 요청이 시간 초과되었습니다.'
        ),
      { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
    );

    const writerContent = writerResponse.content?.trim();
    if (!writerContent) {
      throw new Error('LLM 초안 생성 응답이 비어 있습니다.');
    }

    const writerParsed = parseStrictJson(writerContent);
    const writerDoc = validateProductDescriptionDocument(writerParsed, evidence);

    // 2. Pass 2: Reviewer
    const reviewerPrompts = createProductDescriptionReviewerPrompt(evidence, writerDoc);
    const reviewerResponse = await withRetry(
      () =>
        withTimeout(
          this.llmClient.completion(
            model,
            [
              { role: 'system', content: reviewerPrompts.systemPrompt },
              { role: 'user', content: reviewerPrompts.userPrompt },
            ],
            { thinkingLevel }
          ),
          CALL_TIMEOUT_MS,
          '상품 설명 검수 요청이 시간 초과되었습니다.'
        ),
      { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
    );

    const reviewerContent = reviewerResponse.content?.trim();
    if (!reviewerContent) {
      throw new Error('LLM 검수 응답이 비어 있습니다.');
    }

    const reviewerParsed = parseStrictJson(reviewerContent);
    const reviewedDoc = validateProductDescriptionDocument(reviewerParsed, evidence);

    const candidateHtml = renderProductDescriptionDocument(reviewedDoc);

    return {
      document: reviewedDoc,
      candidateHtml,
      writerModel: model,
      reviewerModel: model,
      writerPromptVersion: PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
      reviewerPromptVersion: PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
      rendererVersion: PRODUCT_DESCRIPTION_RENDERER_VERSION,
    };
  }
}
