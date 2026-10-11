import type { ProductDescriptionDocument, ProductDescriptionEvidence } from '@darun/products-domain';

export function validateProductDescriptionCoverage(
  document: ProductDescriptionDocument,
  evidence: ProductDescriptionEvidence
): void {
  const features = evidence.items.filter(item => item.kind === 'feature' && item.title.trim());
  if (features.length === 0) return;

  const bodyRefs = new Set(document.sections.flatMap(section => section.paragraphs.flatMap(p => p.evidenceRefs)));
  const missing = features.filter(feature => !bodyRefs.has(feature.id));
  if (missing.length > 0) {
    throw new Error(`서비스 소개 본문에 제공된 기능 근거가 누락되었습니다: ${missing.map(item => item.id).join(', ')}`);
  }
  if (document.recommendedIf.length === 0) {
    throw new Error('기능 근거가 있는 서비스 소개에는 기능에 기반한 추천 상황이 필요합니다.');
  }
}
