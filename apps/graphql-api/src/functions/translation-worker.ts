import 'reflect-metadata';
import '../config';
import { TranslationJobService } from '@darun/translation-service';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createMongodbConnection, createPostgresConnection } from '../config/database';

const WORKER_DEADLINE_MS = 4 * 60 * 1000;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  await Promise.all([createPostgresConnection(), createMongodbConnection()]);

  const translationJobService = Container.get(TranslationJobService);

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as {
        jobId: string;
        entityType: string;
        entityId: string;
      };

      console.log(`[TranslationWorker] Processing message ${record.messageId}:`, payload);

      if (payload.jobId && payload.entityType === 'Product') {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WORKER_DEADLINE_MS);
        try {
          await translationJobService.executeProductTranslationJob(payload.jobId, payload.entityId, {
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      console.error(`[TranslationWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
