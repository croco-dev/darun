export type ProductDescriptionJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ProductDescriptionJobEntity = {
  id: string;
  productId: string;
  status: ProductDescriptionJobStatus;
  message?: string | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
