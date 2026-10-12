import type { ProductDescriptionDocument, ProductDescriptionEvidence } from '@darun/products-domain';

export function validateProductDescriptionCoverage(
  document: ProductDescriptionDocument,
  evidence: ProductDescriptionEvidence
): void {
  // Only evidenced core refs are required: substantive product_summary/feature
  // refs that carry descriptive text. Title-only features (existence-only)
  // never force a body mention, and existence alone never implies recommendedIf.
  const summaryItems = evidence.items.filter(
    item => item.kind === 'product_summary' && item.text.trim()
  );
  const substantiveFeatures = evidence.items.filter(
    item => item.kind === 'feature' && item.title.trim() && (item.text?.trim() ?? '')
  );

  const bodyRefs = new Set(document.sections.flatMap(section => section.paragraphs.flatMap(p => p.evidenceRefs)));

  // Core coverage: every substantive feature must appear in the body.
  // Title-only features carry no descriptive text, so their existence alone
  // never forces a body mention or a recommendation.
  const missing = substantiveFeatures.filter(feature => !bodyRefs.has(feature.id));
  if (missing.length > 0) {
    throw new Error(`서비스 소개 본문에 제공된 기능 근거가 누락되었습니다: ${missing.map(item => item.id).join(', ')}`);
  }

  // recommendedIf is tied to body coverage, not mere existence: it is required
  // only when a substantive feature ref is already covered in the body, and at
  // least one body-covered feature must be referenced there. When no feature is
  // covered in the body (summary-only docs), no recommendation is forced.
  const bodyFeatureRefs = substantiveFeatures.filter(feature => bodyRefs.has(feature.id));
  if (bodyFeatureRefs.length === 0) {
    void summaryItems;
    return;
  }
  const recommendedRefs = new Set(document.recommendedIf.flatMap(item => item.evidenceRefs));
  const anyCovered = bodyFeatureRefs.some(feature => recommendedRefs.has(feature.id));
  if (!anyCovered) {
    throw new Error('본문에서 다룬 기능에 기반한 추천 상황이 필요합니다.');
  }
}
