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
import { Container, type ContainerInstance } from 'typedi';
import { RUNNING_ENV } from './environment';
import { registerRepositoryAliases } from './repositoryAliases';

registerRepositoryAliases();

Container.set(CloudinaryImageRepositoryConfig, new CloudinaryImageRepositoryConfig(RUNNING_ENV));

// LLM 서비스 등록 (DB 설정 연동 - lazy factory)
Container.set({
  id: LlmClient,
  factory: (container: ContainerInstance) =>
    new LlmClient({
      getConfig: async () => {
        try {
          return await container.get(LlmSettingService).getConfig();
        } catch (error) {
          console.warn('[LlmClient] Failed to load config from LlmSettingService, falling back to defaults:', error);
          return {
            endpoint: process.env['OPEN_ROUTER_ENDPOINT'] || 'https://openrouter.ai/api/v1',
            apiKey: process.env['OPEN_ROUTER_API_KEY'] || '',
            model: process.env['OPEN_ROUTER_MODEL'] || 'nvidia/nemotron-3-ultra-550b-a55b:free',
            thinkingLevel: process.env['OPEN_ROUTER_THINKING_LEVEL'] || null,
          };
        }
      },
    }),
});
