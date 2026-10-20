import 'reflect-metadata';
import '../config';
import { TranslationJobService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createPostgresConnection } from '../config/database';
import { withJobDeadline } from './jobDeadline';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

  const translationJobService = Container.get(TranslationJobService);

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as {
        jobId: string;
        entityType: string;
        entityId: string;
      };

      console.log(`[TranslationWorker] Processing message ${record.messageId}:`, payload);
      if (
        !payload.jobId ||
        !payload.entityId ||
        !['Product', 'Magazine', 'ProductFeature'].includes(payload.entityType)
      ) {
        throw new Error('Invalid translation queue payload');
      }

      await withJobDeadline(context, options =>
        Container.get(LlmClient).withConfigSnapshot(() =>
          translationJobService.executeTranslationJob(payload.jobId, payload, options)
        )
      );
      await Container.get(PostgresqlProductContentSync).reconcileTranslation(payload.jobId);
    } catch (error) {
      console.error(`[TranslationWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
