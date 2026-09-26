import type {
  EvidenceBackedText,
  ProductDescriptionDocument,
  ProductDescriptionEvidence,
} from '@darun/products-domain';

const MAX_INTRO_LENGTH = 600;
const MAX_CLOSING_LENGTH = 600;
const MAX_PARAGRAPH_LENGTH = 600;
const MAX_SECTION_TITLE_LENGTH = 150;
const MAX_RECOMMENDED_LENGTH = 300;
const MAX_SECTIONS = 3;
const MAX_PARAGRAPHS_PER_SECTION = 2;
const MAX_RECOMMENDED_ITEMS = 3;

export function validateProductDescriptionDocument(
  raw: unknown,
  evidence: ProductDescriptionEvidence
): ProductDescriptionDocument {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('문서가 올바른 JSON 객체 형식이 아닙니다.');
  }

  const candidate = raw as Record<string, unknown>;
  const allowedTopLevelKeys = new Set(['intro', 'sections', 'recommendedIf', 'limitations', 'closing']);
  for (const key of Object.keys(candidate)) {
    if (!allowedTopLevelKeys.has(key)) {
      throw new Error(`허용되지 않은 최상위 필드가 포함되어 있습니다: ${key}`);
    }
  }

  const validEvidenceIds = new Set(evidence.items.map(item => item.id));

  // 1. limitations check
  if (!Array.isArray(candidate.limitations) || candidate.limitations.length > 0) {
    throw new Error('자동 생성에서 limitations는 반드시 빈 배열이어야 합니다.');
  }

  // 2. intro check
  const intro = validateEvidenceBackedText(
    candidate.intro,
    'intro',
    MAX_INTRO_LENGTH,
    validEvidenceIds,
    false // category-only allowed for intro
  );

  // 3. closing check
  const closing = validateEvidenceBackedText(
    candidate.closing,
    'closing',
    MAX_CLOSING_LENGTH,
    validEvidenceIds,
    false // category-only allowed for closing
  );

  // 4. sections check
  if (!Array.isArray(candidate.sections)) {
    throw new Error('sections 필드는 배열이어야 합니다.');
  }
  if (candidate.sections.length > MAX_SECTIONS) {
    throw new Error(`sections 개수는 최대 ${MAX_SECTIONS}개까지 허용됩니다.`);
  }

  const validatedSections = candidate.sections.map((sectionRaw, sectionIdx) => {
    if (typeof sectionRaw !== 'object' || sectionRaw === null || Array.isArray(sectionRaw)) {
      throw new Error(`sections[${sectionIdx}]는 객체여야 합니다.`);
    }
    const section = sectionRaw as Record<string, unknown>;
    if (typeof section.title !== 'string' || !section.title.trim()) {
      throw new Error(`sections[${sectionIdx}].title은 비어있지 않은 문자열이어야 합니다.`);
    }
    const title = section.title.trim();
    if (title.length > MAX_SECTION_TITLE_LENGTH) {
      throw new Error(`sections[${sectionIdx}].title 길이가 제한(${MAX_SECTION_TITLE_LENGTH}자)을 초과했습니다.`);
    }

    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0) {
      throw new Error(`sections[${sectionIdx}].paragraphs는 최소 1개 이상의 문단이 필요합니다.`);
    }
    if (section.paragraphs.length > MAX_PARAGRAPHS_PER_SECTION) {
      throw new Error(
        `sections[${sectionIdx}].paragraphs 문단 수는 최대 ${MAX_PARAGRAPHS_PER_SECTION}개까지 허용됩니다.`
      );
    }

    const paragraphs = section.paragraphs.map((pRaw, pIdx) =>
      validateEvidenceBackedText(
        pRaw,
        `sections[${sectionIdx}].paragraphs[${pIdx}]`,
        MAX_PARAGRAPH_LENGTH,
        validEvidenceIds,
        true // category-only forbidden
      )
    );

    return {
      title,
      paragraphs,
    };
  });

  // 5. recommendedIf check
  if (!Array.isArray(candidate.recommendedIf)) {
    throw new Error('recommendedIf 필드는 배열이어야 합니다.');
  }
  if (candidate.recommendedIf.length > MAX_RECOMMENDED_ITEMS) {
    throw new Error(`recommendedIf 항목은 최대 ${MAX_RECOMMENDED_ITEMS}개까지 허용됩니다.`);
  }

  const validatedRecommendedIf = candidate.recommendedIf.map((itemRaw, idx) =>
    validateEvidenceBackedText(
      itemRaw,
      `recommendedIf[${idx}]`,
      MAX_RECOMMENDED_LENGTH,
      validEvidenceIds,
      true // category-only forbidden
    )
  );

  return {
    intro,
    sections: validatedSections,
    recommendedIf: validatedRecommendedIf,
    limitations: [],
    closing,
  };
}

function validateEvidenceBackedText(
  raw: unknown,
  fieldName: string,
  maxLength: number,
  validEvidenceIds: Set<string>,
  requireSummaryOrFeatureRef: boolean
): EvidenceBackedText {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${fieldName}은(는) 객체 형태여야 합니다.`);
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.text !== 'string' || !obj.text.trim()) {
    throw new Error(`${fieldName}.text는 비어있지 않은 문자열이어야 합니다.`);
  }

  const text = obj.text.trim();
  if (text.length > maxLength) {
    throw new Error(`${fieldName}.text 길이가 제한(${maxLength}자)을 초과했습니다.`);
  }

  if (!Array.isArray(obj.evidenceRefs) || obj.evidenceRefs.length === 0) {
    throw new Error(`${fieldName}.evidenceRefs는 최소 1개 이상의 근거 ID가 필요합니다.`);
  }

  const evidenceRefs = obj.evidenceRefs.map(ref => {
    if (typeof ref !== 'string' || !ref.trim()) {
      throw new Error(`${fieldName}.evidenceRefs에 유효하지 않은 항목이 있습니다.`);
    }
    const cleanRef = ref.trim();
    if (!validEvidenceIds.has(cleanRef)) {
      throw new Error(`${fieldName}.evidenceRefs에 존재하지 않는 근거 ID가 포함되어 있습니다: "${cleanRef}"`);
    }
    return cleanRef;
  });

  if (requireSummaryOrFeatureRef) {
    const hasSummaryOrFeature = evidenceRefs.some(ref => ref === 'product:summary' || ref.startsWith('feature:'));
    if (!hasSummaryOrFeature) {
      throw new Error(
        `${fieldName}은(는) category만으로 작성될 수 없으며 product:summary 또는 feature:* 근거가 포함되어야 합니다.`
      );
    }
  }

  return {
    text,
    evidenceRefs,
  };
}
