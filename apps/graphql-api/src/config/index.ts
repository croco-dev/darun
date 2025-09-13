import 'reflect-metadata';

import './sentry';
import './firebase';
import './storage';
import '@darun/backend/graphql-api';
import { CloudinaryImageRepositoryConfig } from '@darun/backend';
import { LlmClient } from '@darun/utils-llm/src/libs/LlmClient';
import { Container } from 'typedi';
import { RUNNING_ENV } from './environment';

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));

// LLM 서비스 등록
Container.set(LlmClient, new LlmClient());
