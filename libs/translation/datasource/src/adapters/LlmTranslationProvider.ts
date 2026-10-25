import {
  computeSourceHash,
  validateProductBundleTranslation,
  validateTranslationText,
  type ProductBundleTranslationRequest,
  type ProductBundleTranslationResult,
  type SingleTranslationRequest,
  type SingleTranslationResult,
  type TranslationProvider,
  TranslationProviderToken,
} from '@darun/translation-domain';
import { LlmClient, withAbortableStage, withRetry } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { assertDocumentStructure, decodeHtml, encodeHtml, type HtmlCodecResult } from '../codecs/htmlPlaceholderCodec';
import {
  buildAuditPrompt,
  buildProductBundleTranslationPrompt,
  buildSingleTranslationPrompt,
  TRANSLATION_AUDIT_SYSTEM_PROMPT,
  TRANSLATION_PROMPT_VERSION,
  TRANSLATION_SYSTEM_PROMPT,
} from '../prompts/translationPrompt';

function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Models may wrap the mandated JSON in an outer ``` fence; string values may contain ``` runs,
    // so unwrap from the first fence to the last rather than the first inner pair.
    return JSON.parse(trimmed.match(/```(?:json)?\s*([\s\S]*)\s*```/i)?.[1] ?? trimmed);
  }
}

@Service(TranslationProviderToken)
export class LlmTranslationProvider implements TranslationProvider {
  constructor(@Inject(() => LlmClient) private readonly llmClient: LlmClient) {}

  private async completion(
    model: string,
    system: string,
    prompt: string,
    signal?: AbortSignal,
    deadline?: Date,
    budgetMs = 30_000
  ) {
    const response = await withRetry(
      () =>
        withAbortableStage(
          stageSignal =>
            this.llmClient.completion(
              model,
              [
                { role: 'system', content: system },
                { role: 'user', content: prompt },
              ],
              { signal: stageSignal }
            ),
          { budgetMs, signal, message: 'LLM 번역 요청이 시간 초과되었습니다.' }
        ),
      { maxRetries: 1, baseDelay: 1000, maxDelay: 5000, signal, deadline }
    );
    const content = response.content?.trim();
    if (!content) throw new Error('LLM 번역 또는 검토 결과가 비어 있습니다.');
    return content;
  }

  private decode(source: string, candidate: string, encoded: HtmlCodecResult) {
    const translated = decodeHtml(candidate, encoded.placeholders, encoded.tokenOrder);
    assertDocumentStructure(source, translated);
    return translated;
  }

  async translateSingle(request: SingleTranslationRequest): Promise<SingleTranslationResult> {
    const { model } = await this.llmClient.getConfig();
    if (!request.koreanText.trim())
      return {
        translatedText: '',
        sourceHash: computeSourceHash(request.koreanText, request.field),
        model,
        promptVersion: TRANSLATION_PROMPT_VERSION,
      };
    // Plain name/summary/title must reach the Writer as translatable text: Markdown
    // parsing would hide indented or literal code-looking Korean as one immutable
    // placeholder. Document fields keep placeholder encoding and structure checks.
    const document = request.isHtml === true || request.field === 'description' || request.field === 'content';
    const encoded = document ? encodeHtml(request.koreanText) : null;
    const sourceText = encoded?.encodedText ?? request.koreanText;
    let candidate = await this.completion(
      model,
      TRANSLATION_SYSTEM_PROMPT,
      buildSingleTranslationPrompt({
        entityType: request.entityType,
        field: request.field,
        text: sourceText,
        mode: request.mode,
      }),
      request.signal,
      request.deadline
    );
    // Validate the writer before reviewer so a reviewer cannot conceal structural damage.
    if (encoded) this.decode(request.koreanText, candidate, encoded);
    else validateTranslationText(request.koreanText, candidate, request.field);
    if (request.entityType === 'Magazine' || request.mode === 'editorial' || request.mode === 'product_copy') {
      candidate = await this.completion(
        model,
        TRANSLATION_AUDIT_SYSTEM_PROMPT,
        buildAuditPrompt({ sourceText, candidateTranslation: candidate }),
        request.signal,
        request.deadline
      );
    }
    const translatedText = encoded
      ? this.decode(request.koreanText, candidate, encoded)
      : validateTranslationText(request.koreanText, candidate, request.field);
    return {
      translatedText,
      sourceHash: computeSourceHash(request.koreanText, request.field),
      model,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }

  async translateProductBundle(request: ProductBundleTranslationRequest): Promise<ProductBundleTranslationResult> {
    const { model } = await this.llmClient.getConfig();
    // Only the description is a document field. Bundle name/summary and Feature
    // name/summary are plain text whose indented or literal code-looking Korean
    // must reach the Writer instead of hiding behind document placeholders.
    const description = encodeHtml(request.description);
    const encodedRequest = {
      name: request.name,
      summary: request.summary,
      description: description.encodedText,
      features: request.features.map(feature => ({
        id: feature.id,
        name: feature.name,
        summary: feature.summary,
      })),
    };
    const prompt = buildProductBundleTranslationPrompt(encodedRequest);
    const writer = await this.completion(
      model,
      TRANSLATION_SYSTEM_PROMPT,
      prompt,
      request.signal,
      request.deadline,
      120_000
    );
    const decodeBundle = (raw: string) => {
      const validated = validateProductBundleTranslation(encodedRequest, parseJson(raw));
      const decoded = {
        name: validated.product.name,
        summary: validated.product.summary,
        description: this.decode(request.description, validated.product.description, description),
        features: validated.features.map(feature => ({ id: feature.id, name: feature.name, summary: feature.summary })),
      };
      return validateProductBundleTranslation(request, decoded);
    };
    decodeBundle(writer);
    const reviewer = await this.completion(
      model,
      TRANSLATION_AUDIT_SYSTEM_PROMPT,
      `${prompt}\n\n검토할 번역 초안:\n${writer}\n\n원문과 대조하여 모든 필드를 검토하고 동일한 JSON 형식의 최종 번역만 반환하십시오.`,
      request.signal,
      request.deadline,
      120_000
    );
    const validated = decodeBundle(reviewer);
    return {
      product: {
        ...validated.product,
        nameSourceHash: computeSourceHash(request.name),
        summarySourceHash: computeSourceHash(request.summary),
        descriptionSourceHash: computeSourceHash(request.description, 'description'),
      },
      features: validated.features.map(feature => {
        const source = request.features.find(source => source.id === feature.id)!;
        return {
          ...feature,
          nameSourceHash: computeSourceHash(source.name),
          summarySourceHash: computeSourceHash(source.summary),
        };
      }),
      model,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }
}
