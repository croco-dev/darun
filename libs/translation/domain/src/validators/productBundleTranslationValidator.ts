import type { ProductBundleTranslationRequest } from '../ports/TranslationProvider';

export interface ValidatedProductBundleTranslation {
  product: { name: string; summary: string; description: string };
  features: Array<{ id: string; name: string; summary: string }>;
}

/** A nonempty source always needs a nonempty translation; absent optional source must stay empty. */
export function validateTranslationText(source: string, value: unknown, field: string, required = false): string {
  if (typeof value !== 'string') {
    if (!source.trim() && !required && (value === undefined || value === null)) return '';
    throw new Error(`번역 결과의 ${field}가 문자열이 아닙니다.`);
  }
  const text = value.trim();
  if ((source.trim() || required) && !text) throw new Error(`번역 결과의 ${field}가 비어 있습니다.`);
  if (!source.trim() && !required && text) throw new Error(`빈 원문의 ${field}에 번역 내용을 추가할 수 없습니다.`);
  return text;
}

/** The actual provider's sole bundle wire validator, before any hash or row mapping. */
export function validateProductBundleTranslation(
  request: Pick<ProductBundleTranslationRequest, 'name' | 'summary' | 'description' | 'features'>,
  parsed: unknown
): ValidatedProductBundleTranslation {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('번역 결과가 유효한 JSON 객체가 아닙니다.');
  const wire = parsed as { name?: unknown; summary?: unknown; description?: unknown; features?: unknown };
  const name = validateTranslationText(request.name, wire.name, 'name', true);
  const summary = validateTranslationText(request.summary, wire.summary, 'summary');
  const descriptionText = validateTranslationText(request.description, wire.description, 'description');
  // Trimming detects empty optional fields, but can remove Markdown code indentation or hard-break whitespace.
  const description = descriptionText && typeof wire.description === 'string' ? wire.description : '';
  if (!Array.isArray(wire.features)) throw new Error('번역 결과의 features가 배열이 아닙니다.');
  const requested = new Map(request.features.map(feature => [feature.id, feature]));
  if (requested.size !== request.features.length) throw new Error('번역 요청에 중복된 기능 ID가 포함되었습니다.');
  if (request.features.some(feature => !feature.id || feature.id.length > 26))
    throw new Error('번역 요청의 기능 ID 길이가 잘못되었습니다.');
  const byId = new Map<string, { id: string; name: string; summary: string }>();
  for (const item of wire.features) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('잘못된 기능 번역 항목입니다.');
    const feature = item as { id?: unknown; name?: unknown; summary?: unknown };
    if (typeof feature.id !== 'string' || !feature.id || feature.id.length > 26)
      throw new Error('번역 결과의 기능 ID 길이가 잘못되었습니다.');
    const source = requested.get(feature.id);
    if (!source) throw new Error(`번역 결과에 알 수 없는 기능 ID(${feature.id})가 포함되었습니다.`);
    if (byId.has(feature.id)) throw new Error(`번역 결과에 중복된 기능 ID(${feature.id})가 포함되었습니다.`);
    byId.set(feature.id, {
      id: feature.id,
      name: validateTranslationText(source.name, feature.name, `기능(${feature.id}) name`, true),
      summary: validateTranslationText(source.summary, feature.summary, `기능(${feature.id}) summary`),
    });
  }
  for (const id of requested.keys())
    if (!byId.has(id)) throw new Error(`번역 결과에 요청된 기능 ID(${id})가 누락되었습니다.`);
  return { product: { name, summary, description }, features: request.features.map(feature => byId.get(feature.id)!) };
}
