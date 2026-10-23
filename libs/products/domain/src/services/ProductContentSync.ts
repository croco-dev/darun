import { Token } from 'typedi';

export interface ProductContentSyncStatus {
  intentId: string;
  productId: string;
  sourceRevision: string;
  status: 'pending' | 'in_progress' | 'completed' | 'superseded' | 'failed';
  attemptCount: number;
  error?: string;
  dispatchStatus?: string;
  translationJobId?: string;
  translationJobStatus?: string;
  translationDispatchStatus?: string;
}
export interface ProductContentSyncOverview {
  productId: string;
  sourceRevision: string;
  searchStatus: string;
  translationDispatchStatus: string;
  searchIntent?: ProductContentSyncStatus;
  translationIntent?: ProductContentSyncStatus;
  translationJobId?: string;
  translationJobStatus?: string;
  translationJobDispatchStatus?: string;
}
export interface ProductContentSync {
  requestSearch(slug: string): Promise<ProductContentSyncStatus>;
  status(intentId: string): Promise<ProductContentSyncStatus | null>;
  latestStatus(slug: string): Promise<ProductContentSyncOverview>;
  retry(slug: string): Promise<ProductContentSyncOverview>;
}
export const ProductContentSyncToken = new Token<ProductContentSync>('ProductContentSync');
