export type EvidenceRichLink = {
  label: string;
  url: string;
};

export type EvidenceBackedText = {
  text: string;
  evidenceRefs: string[];
  bullets?: string[];
  quote?: boolean;
  link?: EvidenceRichLink | null;
};

export type ProductDescriptionSection = {
  title: string;
  paragraphs: EvidenceBackedText[];
};

export type ProductDescriptionDocument = {
  intro: EvidenceBackedText;
  sections: ProductDescriptionSection[];
  recommendedIf: EvidenceBackedText[];
  limitations: [];
  closing: EvidenceBackedText;
};

/**
 * 소개 문서 형태 제약의 단일 원천. Writer/Reviewer wire JSON schema와
 * runtime validator가 같은 상수를 사용한다.
 */
export const MAX_INTRO_LENGTH = 600;
export const MAX_CLOSING_LENGTH = 600;
export const MAX_PARAGRAPH_LENGTH = 600;
export const MAX_SECTION_TITLE_LENGTH = 150;
export const MAX_RECOMMENDED_LENGTH = 300;
export const MAX_SECTIONS = 3;
export const MAX_PARAGRAPHS_PER_SECTION = 2;
export const MAX_RECOMMENDED_ITEMS = 3;
