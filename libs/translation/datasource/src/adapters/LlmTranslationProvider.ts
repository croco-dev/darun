import {
  computeSourceHash,
  validateProductBundleTranslation,
  type ProductBundleTranslationRequest,
  type ProductBundleTranslationResult,
  type SingleTranslationRequest,
  type SingleTranslationResult,
  type TranslationProvider,
  TranslationProviderToken,
} from '@darun/translation-domain';
import { LlmClient, withAbortableStage, withRetry } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { decodeHtml, encodeHtml } from '../codecs/htmlPlaceholderCodec';
import {
  buildAuditPrompt,
  buildProductBundleTranslationPrompt,
  buildSingleTranslationPrompt,
  TRANSLATION_AUDIT_SYSTEM_PROMPT,
  TRANSLATION_PROMPT_VERSION,
  TRANSLATION_SYSTEM_PROMPT,
} from '../prompts/translationPrompt';

function parseJsonFromLlmResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const target = jsonMatch ? jsonMatch[1].trim() : trimmed;
  return JSON.parse(target);
}

@Service(TranslationProviderToken)
export class LlmTranslationProvider implements TranslationProvider {
  constructor(@Inject(() => LlmClient) private readonly llmClient: LlmClient) {}

  async translateSingle(request: SingleTranslationRequest): Promise<SingleTranslationResult> {
    const { entityType, field, koreanText, mode, isHtml, signal } = request;
    const { model } = await this.llmClient.getConfig();

    let textToTranslate = koreanText;
    let placeholders: Map<string, string> | undefined;
    let tokenOrder: string[] | undefined;

    if (isHtml) {
      const encoded = encodeHtml(koreanText);
      textToTranslate = encoded.encodedText;
      placeholders = encoded.placeholders;
      tokenOrder = encoded.tokenOrder;
    }

    const writerPrompt = buildSingleTranslationPrompt({
      entityType,
      field,
      text: textToTranslate,
      mode,
    });

    const writerResponse = await withRetry(
      () =>
        withAbortableStage(
          stageSignal =>
            this.llmClient.completion(
              model,
              [
                { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
                { role: 'user', content: writerPrompt },
              ],
              { signal: stageSignal }
            ),
          {
            budgetMs: 30_000,
            signal,
            message: 'LLM 번역 요청이 시간 초과되었습니다.',
          }
        ),
      { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
    );

    let translatedCandidate = writerResponse.content?.trim();
    if (!translatedCandidate) {
      throw new Error('LLM 번역 결과가 비어 있습니다.');
    }

    if (mode === 'editorial' || mode === 'product_copy') {
      const auditPrompt = buildAuditPrompt({
        sourceText: textToTranslate,
        candidateTranslation: translatedCandidate,
      });

      const reviewerResponse = await withRetry(
        () =>
          withAbortableStage(
            stageSignal =>
              this.llmClient.completion(
                model,
                [
                  { role: 'system', content: TRANSLATION_AUDIT_SYSTEM_PROMPT },
                  { role: 'user', content: auditPrompt },
                ],
                { signal: stageSignal }
              ),
            {
              budgetMs: 30_000,
              signal,
              message: 'LLM 번역 검토 요청이 시간 초과되었습니다.',
            }
          ),
        { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
      );

      const audited = reviewerResponse.content?.trim();
      if (!audited) {
        throw new Error('LLM 번역 검토 결과가 비어 있습니다.');
      }
      translatedCandidate = audited;
    }

    let finalTranslatedText = translatedCandidate;
    if (isHtml && placeholders) {
      finalTranslatedText = decodeHtml(translatedCandidate, placeholders, tokenOrder);
    }

    return {
      translatedText: finalTranslatedText,
      sourceHash: computeSourceHash(koreanText),
      model,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }

  async translateProductBundle(request: ProductBundleTranslationRequest): Promise<ProductBundleTranslationResult> {
    const { name, summary, description, features, signal } = request;
    const { model } = await this.llmClient.getConfig();

    const encodedDesc = encodeHtml(description);

    const bundlePrompt = buildProductBundleTranslationPrompt({
      name,
      summary,
      description: encodedDesc.encodedText,
      features,
    });

    const response = await withRetry(
      () =>
        withAbortableStage(
          stageSignal =>
            this.llmClient.completion(
              model,
              [
                { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
                { role: 'user', content: bundlePrompt },
              ],
              { signal: stageSignal }
            ),
          {
            budgetMs: 120_000,
            signal,
            message: 'LLM 제품 번역 요청이 시간 초과되었습니다.',
          }
        ),
      { maxRetries: 2, baseDelay: 2000, maxDelay: 10000 }
    );

    const rawJson = response.content?.trim();
    if (!rawJson) {
      throw new Error('LLM 번역 응답이 비어 있습니다.');
    }

    let parsed: unknown;
    try {
      parsed = parseJsonFromLlmResponse(rawJson);
    } catch {
      throw new Error(`번역 결과 JSON 파싱에 실패했습니다: ${rawJson}`);
    }

    const validated = validateProductBundleTranslation({ features }, parsed);

    const finalDescription = decodeHtml(
      validated.product.description,
      encodedDesc.placeholders,
      encodedDesc.tokenOrder
    );

    // 검증자가 요청 순서로 정규화했으므로 요청 순서대로 ID로 대조한다.
    // 인덱스 매핑은 순서 가정이 깨지면 잘못된 feature에 값을 붙이므로 사용하지 않는다.
    const featureResults = features.map(reqFeature => {
      const translatedFeature = validated.features.find(f => f.id === reqFeature.id);
      if (!translatedFeature) {
        throw new Error(`번역 결과에 요청된 기능 ID(${reqFeature.id})가 누락되었습니다.`);
      }
      return {
        id: reqFeature.id,
        name: translatedFeature.name,
        summary: translatedFeature.summary,
        nameSourceHash: computeSourceHash(reqFeature.name),
        summarySourceHash: computeSourceHash(reqFeature.summary),
      };
    });

    return {
      product: {
        name: validated.product.name,
        summary: validated.product.summary,
        description: finalDescription.trim(),
        nameSourceHash: computeSourceHash(name),
        summarySourceHash: computeSourceHash(summary),
        descriptionSourceHash: computeSourceHash(description),
      },
      features: featureResults,
      model,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }
}
