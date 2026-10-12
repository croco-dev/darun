import 'reflect-metadata';
import '../config';
import { CategoryRepositoryToken, ProductResearchJobRepositoryToken } from '@darun/products-domain';
import { PRODUCT_RESEARCH_PROMPT_VERSION, ProductResearchService } from '@darun/products-service';
import { LlmSettingService } from '@darun/translation-service';
import { BraveSearchClient, LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createMongodbConnection, createPostgresConnection } from '../config/database';

const WORKER_DEADLINE_MS = 4 * 60 * 1000;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  await Promise.all([createPostgresConnection(), createMongodbConnection()]);

  const researchService = Container.get(ProductResearchService);
  const jobRepository = Container.get(ProductResearchJobRepositoryToken);
  const categoryRepository = Container.get(CategoryRepositoryToken);
  const llmClient = Container.get(LlmClient);
  const llmSettingService = Container.get(LlmSettingService);
  const searchClient = new BraveSearchClient(() => llmSettingService.getBraveApiKey());

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as { jobId: string };
      console.log(`[ProductResearchWorker] Processing message ${record.messageId}:`, payload);
      if (payload.jobId) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WORKER_DEADLINE_MS);
        try {
          await researchService.executeResearch(
            payload.jobId,
            {
              jobRepository,
              categoryRepository,
              searchClient: {
                search: (query, count, childSignal) =>
                  searchClient.search(query, count, childSignal ?? controller.signal),
              },
              llm: {
                getModel: async () => (await llmClient.getConfig()).model,
                complete: async (systemPrompt, userPrompt, options) => {
                  const message = await llmClient.completion(
                    [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: userPrompt },
                    ],
                    undefined,
                    {
                      responseFormat: ProductResearchService.researchResponseFormat(),
                      signal: options?.signal ?? controller.signal,
                    }
                  );
                  const content = typeof message.content === 'string' ? message.content : '';
                  if (!content.trim()) {
                    throw new Error('LLM 응답이 비어 있습니다.');
                  }
                  return content;
                },
              },
              promptVersion: PRODUCT_RESEARCH_PROMPT_VERSION,
            },
            undefined,
            { signal: controller.signal }
          );
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      console.error(`[ProductResearchWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
