export type EvidenceRichLink = {
  label: string;
  url: string;
};

export type EvidenceBackedText = {
  text: string;
  evidenceRefs: string[];
  bullets?: string[];
  quote?: boolean;
  link?: EvidenceRichLink;
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
