import 'reflect-metadata';
import '../config';
import { ProductDescriptionJobService } from '@darun/products-service';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createMongodbConnection, createPostgresConnection } from '../config/database';

const WORKER_DEADLINE_MS = 4 * 60 * 1000;

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  await Promise.all([createPostgresConnection(), createMongodbConnection()]);

  const productDescriptionJobService = Container.get(ProductDescriptionJobService);

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as {
        jobId: string;
        productId: string;
      };

      console.log(`[ProductDescriptionWorker] Processing message ${record.messageId}:`, payload);

      if (payload.jobId && payload.productId) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WORKER_DEADLINE_MS);
        try {
          await productDescriptionJobService.executeJob(payload.jobId, payload.productId, {
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      console.error(`[ProductDescriptionWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
