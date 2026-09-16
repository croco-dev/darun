export type TranslationJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type TranslationJobEntity = {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  status: TranslationJobStatus;
  message?: string | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
