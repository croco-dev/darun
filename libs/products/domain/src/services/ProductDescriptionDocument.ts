export type EvidenceBackedText = {
  text: string;
  evidenceRefs: string[];
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
