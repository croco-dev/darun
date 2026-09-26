import {
  computeSourceHash,
  type ProductBundleTranslationRequest,
  type ProductBundleTranslationResult,
  type SingleTranslationRequest,
  type SingleTranslationResult,
  type TranslationProvider,
  TranslationProviderToken,
} from '@darun/translation-domain';
import { LlmClient, withRetry, withTimeout } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { decodeHtml, encodeHtml } from '../codecs/htmlPlaceholderCodec';
import {
  buildAuditPrompt,
  buildProductBundleTranslationPrompt,
  buildSingleTranslationPrompt,
  TRANSLATION_AUDIT_SYSTEM_PROMPT,
  TRANSLATION_PROMPT_VERSION,
  TRANSLATION_REVIEWER_MODEL,
  TRANSLATION_SYSTEM_PROMPT,
  TRANSLATION_WRITER_MODEL,
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
    const { entityType, field, koreanText, mode, isHtml } = request;

    let textToTranslate = koreanText;
    let placeholders: Map<string, string> | undefined;

    if (isHtml) {
      const encoded = encodeHtml(koreanText);
      textToTranslate = encoded.encodedText;
      placeholders = encoded.placeholders;
    }

    const writerPrompt = buildSingleTranslationPrompt({
      entityType,
      field,
      text: textToTranslate,
      mode,
    });

    const writerResponse = await withRetry(
      () =>
        withTimeout(
          this.llmClient.completion(TRANSLATION_WRITER_MODEL, [
            { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
            { role: 'user', content: writerPrompt },
          ]),
          30_000,
          'LLM 번역 요청이 시간 초과되었습니다.'
        ),
      { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
    );

    let translatedCandidate = writerResponse.content?.trim();
    if (!translatedCandidate) {
      throw new Error('LLM 번역 결과가 비어 있습니다.');
    }

    if (mode === 'editorial' || mode === 'product_copy') {
      try {
        const auditPrompt = buildAuditPrompt({
          sourceText: textToTranslate,
          candidateTranslation: translatedCandidate,
        });

        const reviewerResponse = await withRetry(
          () =>
            withTimeout(
              this.llmClient.completion(TRANSLATION_REVIEWER_MODEL, [
                { role: 'system', content: TRANSLATION_AUDIT_SYSTEM_PROMPT },
                { role: 'user', content: auditPrompt },
              ]),
              30_000,
              'LLM 번역 검토 요청이 시간 초과되었습니다.'
            ),
          { maxRetries: 1, baseDelay: 1000, maxDelay: 5000 }
        );

        const audited = reviewerResponse.content?.trim();
        if (audited) {
          translatedCandidate = audited;
        }
      } catch (auditErr) {
        console.warn('[LlmTranslationProvider] Audit review failed, keeping writer candidate:', auditErr);
      }
    }

    let finalTranslatedText = translatedCandidate;
    if (isHtml && placeholders) {
      finalTranslatedText = decodeHtml(translatedCandidate, placeholders);
    }

    return {
      translatedText: finalTranslatedText,
      sourceHash: computeSourceHash(koreanText),
      model: TRANSLATION_WRITER_MODEL,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }

  async translateProductBundle(request: ProductBundleTranslationRequest): Promise<ProductBundleTranslationResult> {
    const { name, summary, description, features } = request;

    const encodedDesc = encodeHtml(description);

    const bundlePrompt = buildProductBundleTranslationPrompt({
      name,
      summary,
      description: encodedDesc.encodedText,
      features,
    });

    const response = await withRetry(
      () =>
        withTimeout(
          this.llmClient.completion(TRANSLATION_WRITER_MODEL, [
            { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
            { role: 'user', content: bundlePrompt },
          ]),
          120_000,
          'LLM 제품 번역 요청이 시간 초과되었습니다.'
        ),
      { maxRetries: 2, baseDelay: 2000, maxDelay: 10000 }
    );

    const rawJson = response.content?.trim();
    if (!rawJson) {
      throw new Error('LLM 번역 응답이 비어 있습니다.');
    }

    let parsed: {
      name?: string;
      summary?: string;
      description?: string;
      features?: Array<{ id?: string; name?: string; summary?: string }>;
    };
    try {
      parsed = parseJsonFromLlmResponse(rawJson) as typeof parsed;
    } catch {
      throw new Error(`번역 결과 JSON 파싱에 실패했습니다: ${rawJson}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('번역 결과가 유효한 JSON 객체가 아닙니다.');
    }

    if (!parsed.name || typeof parsed.name !== 'string') {
      throw new Error('번역 결과에 name이 누락되었거나 문자열이 아닙니다.');
    }
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      throw new Error('번역 결과에 summary가 누락되었거나 문자열이 아닙니다.');
    }
    if (!parsed.description || typeof parsed.description !== 'string') {
      throw new Error('번역 결과에 description이 누락되었거나 문자열이 아닙니다.');
    }
    if (!Array.isArray(parsed.features)) {
      throw new Error('번역 결과에 features가 배열이 아닙니다.');
    }

    const expectedFeatureIds = new Set(features.map(f => f.id));
    const returnedFeatureIds = new Set(parsed.features.map(f => f.id));

    if (expectedFeatureIds.size !== returnedFeatureIds.size) {
      throw new Error(`기능 개수 불일치: 요청 ${expectedFeatureIds.size}개, 응답 ${returnedFeatureIds.size}개`);
    }

    for (const id of expectedFeatureIds) {
      if (!returnedFeatureIds.has(id)) {
        throw new Error(`번역 결과에 요청된 기능 ID(${id})가 누락되었습니다.`);
      }
    }

    const finalDescription = decodeHtml(parsed.description, encodedDesc.placeholders);

    const featureResults = features.map(reqFeature => {
      const translatedFeature = parsed.features?.find(f => f.id === reqFeature.id);
      return {
        id: reqFeature.id,
        name: translatedFeature?.name?.trim() ?? '',
        summary: translatedFeature?.summary?.trim() ?? '',
        nameSourceHash: computeSourceHash(reqFeature.name),
        summarySourceHash: computeSourceHash(reqFeature.summary),
      };
    });

    return {
      product: {
        name: parsed.name.trim(),
        summary: parsed.summary.trim(),
        description: finalDescription.trim(),
        nameSourceHash: computeSourceHash(name),
        summarySourceHash: computeSourceHash(summary),
        descriptionSourceHash: computeSourceHash(description),
      },
      features: featureResults,
      model: TRANSLATION_WRITER_MODEL,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    };
  }
}
