import { Token } from 'typedi';

export interface TranslationRow {
  id: string;
  entityType: string;
  entityId: string;
  locale: string;
  field: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationRepository {
  findOne(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
  }): Promise<TranslationRow | null>;
  upsert(params: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
    value: string;
  }): Promise<TranslationRow>;
  findByEntity(params: { entityType: string; entityId: string; locale: string }): Promise<TranslationRow[]>;
}

export const TranslationRepositoryToken = new Token<TranslationRepository>('TranslationRepository');
