import 'reflect-metadata';
import '../config';
import { ProductDescriptionJobService } from '@darun/products-service';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createMongodbConnection, createPostgresConnection } from '../config/database';

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
        await productDescriptionJobService.executeJob(payload.jobId, payload.productId);
      }
    } catch (error) {
      console.error(`[ProductDescriptionWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
