import 'reflect-metadata';
import '../config';
import { CategoryRepositoryToken, ProductResearchJobRepositoryToken } from '@darun/products-domain';
import { PRODUCT_RESEARCH_PROMPT_VERSION, ProductResearchService } from '@darun/products-service';
import { LlmSettingService } from '@darun/translation-service';
import { BraveSearchClient, LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createPostgresConnection } from '../config/database';
import { withJobDeadline } from './jobDeadline';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

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
        await withJobDeadline(context, workerOptions =>
          llmClient.withConfigSnapshot(async () => {
            await researchService.executeResearch(
              payload.jobId,
              {
                jobRepository,
                categoryRepository,
                searchClient: {
                  search: (query, count, childSignal) =>
                    searchClient.search(query, count, childSignal ?? workerOptions.signal),
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
                        signal: options?.signal ?? workerOptions.signal,
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
              workerOptions
            );
          })
        );
      }
    } catch (error) {
      console.error(`[ProductResearchWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
