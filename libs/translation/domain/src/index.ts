export type {
  TranslationRepository,
  TranslationRow,
  UpsertTranslationParams,
} from './repositories/TranslationRepository';
export { TranslationRepositoryToken } from './repositories/TranslationRepository';
export type { LlmSetting } from './entities/LlmSetting';
export type { LlmSettingRepository } from './repositories/LlmSettingRepository';
export { LlmSettingRepositoryToken } from './repositories/LlmSettingRepository';
export type { TranslationJobEntity, TranslationJobStatus } from './entities/TranslationJobEntity';
export type { TranslationJobRepository } from './repositories/TranslationJobRepository';
export { TranslationJobRepositoryToken } from './repositories/TranslationJobRepository';

export type {
  TranslationMode,
  SingleTranslationRequest,
  SingleTranslationResult,
  ProductBundleTranslationRequest,
  ProductBundleTranslationResult,
  TranslationProvider,
} from './ports/TranslationProvider';
export { TranslationProviderToken } from './ports/TranslationProvider';

export {
  validateProductBundleTranslation,
  validateTranslationText,
} from './validators/productBundleTranslationValidator';
export type { ValidatedProductBundleTranslation } from './validators/productBundleTranslationValidator';

export { TranslationService } from './services/TranslationService';
export { computeSourceHash, normalizeSourceText } from './utils/sourceHash';
export type {
  TranslationEntityType,
  TranslationSourceRequest,
  TranslationSourceSnapshot,
  TranslationSourceStore,
  TranslationCommit,
  TranslationCommitResult,
} from './ports/TranslationSourceStore';
export { TranslationSourceStoreToken, TRANSLATION_FIELDS, translationFields } from './ports/TranslationSourceStore';
