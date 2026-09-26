export type ProductDescriptionJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'superseded';

export type ProductDescriptionJobEntity = {
  id: string;
  productId: string;
  status: ProductDescriptionJobStatus;
  message?: string | null;
  error?: string | null;
  evidenceHash?: string | null;
  baseDescriptionHash?: string | null;
  candidateDocument?: string | null;
  candidateHtml?: string | null;
  writerModel?: string | null;
  reviewerModel?: string | null;
  writerPromptVersion?: string | null;
  reviewerPromptVersion?: string | null;
  rendererVersion?: string | null;
  appliedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
