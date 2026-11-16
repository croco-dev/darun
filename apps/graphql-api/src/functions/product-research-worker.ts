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
import { isQueueId, processJobQueueMessages } from './processJobQueueMessages';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

  const researchService = Container.get(ProductResearchService);
  const jobRepository = Container.get(ProductResearchJobRepositoryToken);
  const categoryRepository = Container.get(CategoryRepositoryToken);
  const llmClient = Container.get(LlmClient);
  const llmSettingService = Container.get(LlmSettingService);
  const searchClient = new BraveSearchClient(() => llmSettingService.getBraveApiKey());

  await processJobQueueMessages(event.Records, async ({ jobId }) => {
    if (!isQueueId(jobId)) throw new Error('Invalid product research queue payload');
    await withJobDeadline(context, workerOptions =>
      llmClient.withConfigSnapshot(async () => {
        const result = await researchService.executeResearch(
          jobId,
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
        // A fenced settlement can also return null while the job still exists.
        if (result === null && !(await jobRepository.findById(jobId))) {
          throw new Error('Research queue identity mismatch');
        }
      })
    );
  });
};
