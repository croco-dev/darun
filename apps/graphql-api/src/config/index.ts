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
import { LlmClient } from '@darun/utils-llm/src/libs/LlmClient';
import { Container } from 'typedi';
import { RUNNING_ENV } from './environment';

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));

// LLM 서비스 등록
Container.set(LlmClient, new LlmClient());
