import type { ProductBundleTranslationRequest } from '../ports/TranslationProvider';

export interface ValidatedProductBundleTranslation {
  product: {
    name: string;
    summary: string;
    description: string;
  };
  features: Array<{
    id: string;
    name: string;
    summary: string;
  }>;
}

type WireFeature = {
  id?: unknown;
  name?: unknown;
  summary?: unknown;
};

function requiredText(value: unknown, missingMessage: string): string {
  if (typeof value !== 'string') {
    throw new Error(missingMessage);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(missingMessage);
  }
  return trimmed;
}

function optionalText(value: unknown, invalidMessage: string): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new Error(invalidMessage);
  }
  return value.trim();
}

/**
 * 제품 번들 번역 응답의 유일한 정적 검증 지점.
 *
 * wire DTO(필수 전체 충족, 부재 optional은 ''로 정규화)와
 * domain optional DTO 사이의 정규화를 여기서 한 번만 수행한다.
 * production provider와 legacy adapter가 이 함수를 공유하므로
 * 검증 분기가 두 군데서 어긋날 수 없다.
 *
 * 규칙:
 * - product.name / feature.name은 필수이며 공백만 있는 값도 거부한다.
 * - product.summary / product.description / feature.summary는 선택이며
 *   누락·null은 ''로 정규화하고 합법적인 빈 문자열을 그대로 둔다.
 * - features 응답의 중복 ID·알 수 없는 ID·누락 ID를 각각 거부한다.
 * - 반환된 feature 순서는 요청 순서를 따른다.
 */
export function validateProductBundleTranslation(
  request: Pick<ProductBundleTranslationRequest, 'features'>,
  parsed: unknown
): ValidatedProductBundleTranslation {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('번역 결과가 유효한 JSON 객체가 아닙니다.');
  }

  const wire = parsed as {
    name?: unknown;
    summary?: unknown;
    description?: unknown;
    features?: unknown;
  };

  const name = requiredText(wire.name, '번역 결과에 name이 누락되었거나 문자열이 아닙니다.');
  const summary = optionalText(wire.summary, '번역 결과의 summary가 문자열이 아닙니다.');
  const description = optionalText(wire.description, '번역 결과의 description이 문자열이 아닙니다.');

  if (!Array.isArray(wire.features)) {
    throw new Error('번역 결과에 features가 배열이 아닙니다.');
  }

  const requestedIds = request.features.map(feature => feature.id);
  const requestedIdSet = new Set(requestedIds);
  const seen = new Set<string>();
  const byId = new Map<string, { name: string; summary: string }>();

  for (const item of wire.features) {
    const feature = (item ?? {}) as WireFeature;
    const id = typeof feature.id === 'string' ? feature.id : '';
    if (!id || !requestedIdSet.has(id)) {
      throw new Error(`번역 결과에 알 수 없는 기능 ID(${id || '없음'})가 포함되었습니다.`);
    }
    if (seen.has(id)) {
      throw new Error(`번역 결과에 중복된 기능 ID(${id})가 포함되었습니다.`);
    }
    seen.add(id);

    const featureName = requiredText(feature.name, `번역 결과의 기능(${id}) name이 누락되었거나 비어 있습니다.`);
    const featureSummary = optionalText(feature.summary, `번역 결과의 기능(${id}) summary가 문자열이 아닙니다.`);
    byId.set(id, { name: featureName, summary: featureSummary });
  }

  for (const id of requestedIds) {
    if (!byId.has(id)) {
      throw new Error(`번역 결과에 요청된 기능 ID(${id})가 누락되었습니다.`);
    }
  }

  return {
    product: { name, summary, description },
    features: requestedIds.map(id => {
      const normalized = byId.get(id);
      if (!normalized) {
        throw new Error(`번역 결과에 요청된 기능 ID(${id})가 누락되었습니다.`);
      }
      return { id, name: normalized.name, summary: normalized.summary };
    }),
  };
}
