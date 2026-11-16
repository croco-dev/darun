import 'reflect-metadata';
import '../config';
import { TranslationJobService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createPostgresConnection } from '../config/database';
import { withJobDeadline } from './jobDeadline';
import { isQueueId, processJobQueueMessages } from './processJobQueueMessages';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

  const translationJobService = Container.get(TranslationJobService);

  await processJobQueueMessages(event.Records, async ({ jobId, entityType, entityId }) => {
    if (
      !isQueueId(jobId) ||
      !isQueueId(entityId) ||
      (entityType !== 'Product' && entityType !== 'Magazine' && entityType !== 'ProductFeature')
    ) {
      throw new Error('Invalid translation queue payload');
    }

    const payload = { jobId, entityType, entityId };
    await withJobDeadline(context, options =>
      Container.get(LlmClient).withConfigSnapshot(() =>
        translationJobService.executeTranslationJob(jobId, payload, options)
      )
    );
    await Container.get(PostgresqlProductContentSync).reconcileTranslation(jobId);
  });
};
