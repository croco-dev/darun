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
import { CloudinaryImageRepositoryConfig } from '@darun/images-datasource';
import { LlmSettingService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { Container } from 'typedi';
import { RUNNING_ENV } from './environment';
import { registerRepositoryAliases } from './repositoryAliases';

registerRepositoryAliases();

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));

// LLM 서비스 등록 (DB 설정 연동)
const llmConfigProvider = Container.get(LlmSettingService);
Container.set(LlmClient, new LlmClient(llmConfigProvider));
