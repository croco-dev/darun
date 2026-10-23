import {
  MAX_EVIDENCE_BULLETS,
  MAX_EVIDENCE_BULLET_LENGTH,
  safeReaderFacingUrl,
  MAX_INTRO_LENGTH,
  MAX_CLOSING_LENGTH,
  MAX_PARAGRAPH_LENGTH,
  MAX_SECTION_TITLE_LENGTH,
  MAX_RECOMMENDED_LENGTH,
  MAX_SECTIONS,
  MAX_PARAGRAPHS_PER_SECTION,
  MAX_RECOMMENDED_ITEMS,
  type EvidenceBackedText,
  type EvidenceRichLink,
  type ProductDescriptionDocument,
  type ProductDescriptionEvidence,
  type ProductDescriptionEvidenceItem,
} from '@darun/products-domain';

const HTML_TAG_PATTERN = /<[a-zA-Z][^<>]*>/;

function containsMarkdownFormat(text: string): boolean {
  if (text.includes('**') || text.includes('__') || text.includes('`')) {
    return true;
  }
  const linkStart = text.indexOf('[');
  if (linkStart === -1) {
    return false;
  }
  const linkMiddle = text.indexOf('](', linkStart + 1);
  if (linkMiddle === -1) {
    return false;
  }
  return text.indexOf(')', linkMiddle + 2) !== -1;
}

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
  const evidenceById = new Map<string, ProductDescriptionEvidenceItem>(evidence.items.map(item => [item.id, item]));

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
    evidenceById,
    false // category-only allowed for intro
  );

  // 3. closing check
  const closing = validateEvidenceBackedText(
    candidate.closing,
    'closing',
    MAX_CLOSING_LENGTH,
    validEvidenceIds,
    evidenceById,
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
    for (const key of Object.keys(section)) {
      if (key !== 'title' && key !== 'paragraphs') {
        throw new Error(`sections[${sectionIdx}]에 허용되지 않은 필드가 포함되어 있습니다: ${key}`);
      }
    }
    if (typeof section.title !== 'string' || !section.title.trim()) {
      throw new Error(`sections[${sectionIdx}].title은 비어있지 않은 문자열이어야 합니다.`);
    }
    assertPlainRichText(section.title, `sections[${sectionIdx}].title`);
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
        evidenceById,
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
      evidenceById,
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
  evidenceById: Map<string, ProductDescriptionEvidenceItem>,
  requireSummaryOrFeatureRef: boolean
): EvidenceBackedText {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${fieldName}은(는) 객체 형태여야 합니다.`);
  }

  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!['text', 'evidenceRefs', 'bullets', 'quote', 'link'].includes(key)) {
      throw new Error(`${fieldName}에 허용되지 않은 필드가 포함되어 있습니다: ${key}`);
    }
  }
  if (typeof obj.text !== 'string' || !obj.text.trim()) {
    throw new Error(`${fieldName}.text는 비어있지 않은 문자열이어야 합니다.`);
  }

  const text = obj.text.trim();
  if (text.length > maxLength) {
    throw new Error(`${fieldName}.text 길이가 제한(${maxLength}자)을 초과했습니다.`);
  }
  assertPlainRichText(text, fieldName);

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
    const hasSubstantiveRef = evidenceRefs.some(
      ref =>
        ref === 'product:summary' ||
        ref.startsWith('feature:') ||
        ref.startsWith('flow:') ||
        ref.startsWith('research:')
    );
    if (!hasSubstantiveRef) {
      throw new Error(
        `${fieldName}은(는) category, tag, link, screenshot만으로 작성될 수 없으며 product:summary, feature:*, flow:*, research:* 근거 중 하나가 포함되어야 합니다.`
      );
    }
  }

  const bullets = validateBullets(obj.bullets, fieldName);
  const quote = validateQuote(obj.quote, fieldName);
  const link = validateRichLink(obj.link, fieldName, evidenceById, evidenceRefs);

  return {
    text,
    evidenceRefs,
    bullets,
    quote,
    link,
  };
}

function assertPlainRichText(text: string, fieldName: string): void {
  if (HTML_TAG_PATTERN.test(text)) {
    throw new Error(`${fieldName}.text에는 HTML 태그를 직접 쓸 수 없습니다. bullets/quote/link 필드를 사용하십시오.`);
  }
  if (containsMarkdownFormat(text)) {
    throw new Error(
      `${fieldName}.text에는 Markdown 서식을 쓸 수 없습니다. 일반 텍스트로 작성하고 구조는 전용 필드를 사용하십시오.`
    );
  }
}

function validateBullets(raw: unknown, fieldName: string): string[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new Error(`${fieldName}.bullets는 문자열 배열이어야 합니다.`);
  }
  if (raw.length > MAX_EVIDENCE_BULLETS) {
    throw new Error(`${fieldName}.bullets 항목은 최대 ${MAX_EVIDENCE_BULLETS}개까지 허용됩니다.`);
  }
  return raw.map((item, idx) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error(`${fieldName}.bullets[${idx}]는 비어있지 않은 문자열이어야 합니다.`);
    }
    const bullet = item.trim();
    if (bullet.length > MAX_EVIDENCE_BULLET_LENGTH) {
      throw new Error(`${fieldName}.bullets[${idx}] 길이가 제한(${MAX_EVIDENCE_BULLET_LENGTH}자)을 초과했습니다.`);
    }
    assertPlainRichText(bullet, `${fieldName}.bullets[${idx}]`);
    return bullet;
  });
}

function validateQuote(raw: unknown, fieldName: string): boolean {
  if (raw === undefined) {
    return false;
  }
  if (typeof raw !== 'boolean') {
    throw new Error(`${fieldName}.quote는 boolean이어야 합니다.`);
  }
  if (raw) {
    throw new Error(`${fieldName}.quote: 새 생성에서는 직접 인용을 입증할 수 없어 true를 허용하지 않습니다.`);
  }
  return false;
}

function validateRichLink(
  raw: unknown,
  fieldName: string,
  evidenceById: Map<string, ProductDescriptionEvidenceItem>,
  evidenceRefs: string[]
): EvidenceRichLink | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${fieldName}.link는 { label, url } 객체여야 합니다.`);
  }
  const link = raw as Record<string, unknown>;
  for (const key of Object.keys(link)) {
    if (key !== 'label' && key !== 'url') {
      throw new Error(`${fieldName}.link에 허용되지 않은 필드가 포함되어 있습니다: ${key}`);
    }
  }
  if (typeof link.label !== 'string' || !link.label.trim()) {
    throw new Error(`${fieldName}.link.label은 비어있지 않은 문자열이어야 합니다.`);
  }
  if (typeof link.url !== 'string' || !link.url.trim()) {
    throw new Error(`${fieldName}.link.url은 비어있지 않은 문자열이어야 합니다.`);
  }
  const label = link.label.trim();
  assertPlainRichText(label, `${fieldName}.link.label`);
  const safeUrl = safeReaderFacingUrl(link.url.trim());
  if (!safeUrl) {
    throw new Error(`${fieldName}.link.url은 credential 없는 공개 http(s) URL이어야 합니다.`);
  }

  const linkedEvidence = evidenceRefs
    .map(ref => evidenceById.get(ref))
    .filter(item => item?.kind === 'link' || item?.kind === 'research');
  if (linkedEvidence.length === 0) {
    throw new Error(`${fieldName}.link를 쓰려면 link:* 또는 research:* 근거를 evidenceRefs에 포함해야 합니다.`);
  }
  if (
    !linkedEvidence.some(item => item && (item.kind === 'link' || item.kind === 'research') && item.url === safeUrl)
  ) {
    throw new Error(`${fieldName}.link.url은 인용한 link 또는 research 근거의 URL과 일치해야 합니다.`);
  }
  return { label, url: safeUrl };
}
