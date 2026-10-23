import 'reflect-metadata';

import './sentry';
import './firebase';
import './storage';
import '@darun/accounts-datasource';
import '@darun/companies-datasource';
import '@darun/search-datasource';
import '@darun/recommendation-datasource';
import '@darun/images-datasource';
import '@darun/voting-datasource';
import '@darun/magazines-datasource';
import '@darun/translation-datasource';
import '@darun/products-datasource';
import '../adapters/PostgresqlTranslationSourceStore';
import { CloudinaryImageRepositoryConfig } from '@darun/images-datasource';
import { ProductContentSyncToken } from '@darun/products-domain';
import { MongodbSearchConnectionToken } from '@darun/search-datasource';
import { LlmSettingService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { Container, type ContainerInstance } from 'typedi';
import { ProductContentSyncRegistrarToken } from '../../../../libs/products/datasource/src/repositories/productContentSync';
import { PostgresqlProductContentSync, registerProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createMongodbConnection } from './database';
import { RUNNING_ENV } from './environment';
import { registerRepositoryAliases } from './repositoryAliases';

registerRepositoryAliases();

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));
Container.set(MongodbSearchConnectionToken, createMongodbConnection);
Container.set({
  id: ProductContentSyncToken,
  factory: (container: ContainerInstance) => container.get(PostgresqlProductContentSync),
});
Container.set(ProductContentSyncRegistrarToken, { register: registerProductContentSync });

// LLM 서비스 등록 (DB 설정 연동 - lazy factory).
// LlmSettingService.getConfig의 설정 조회 장애는 LLM_CONFIG_READ_FAILED로 그대로 전파된다.
Container.set({
  id: LlmClient,
  factory: (container: ContainerInstance) =>
    new LlmClient({
      getConfig: () => container.get(LlmSettingService).getConfig(),
    }),
});
