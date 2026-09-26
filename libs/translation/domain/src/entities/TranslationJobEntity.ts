export type TranslationJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'superseded';

export type TranslationJobEntity = {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  status: TranslationJobStatus;
  message?: string | null;
  error?: string | null;
  sourceHash?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
