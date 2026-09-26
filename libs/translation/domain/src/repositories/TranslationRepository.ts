import { Token } from 'typedi';

export interface TranslationRow {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  field: string;
  value: string;
  sourceHash?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertTranslationParams {
  entityType: string;
  entityId: string;
  locale: string;
  field: string;
  value: string;
  sourceHash?: string | null;
  model?: string | null;
  promptVersion?: string | null;
}

export interface TranslationRepository {
  findOne(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
  }): Promise<TranslationRow | null>;
  findMany(params: {
    entityType: string;
    locale: string;
    entities: Array<{
      entityId: string;
      field: string;
    }>;
  }): Promise<TranslationRow[]>;
  upsert(params: UpsertTranslationParams): Promise<TranslationRow>;
  upsertMany(rows: UpsertTranslationParams[]): Promise<TranslationRow[]>;
  findByEntity(params: { entityType: string; entityId: string; locale: string }): Promise<TranslationRow[]>;
}

export const TranslationRepositoryToken = new Token<TranslationRepository>('TranslationRepository');
