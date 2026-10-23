import 'reflect-metadata';
import '../config';
import { ProductDescriptionJobService } from '@darun/products-service';
import { LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createPostgresConnection } from '../config/database';
import { withJobDeadline } from './jobDeadline';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

  const productDescriptionJobService = Container.get(ProductDescriptionJobService);

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body) as {
        jobId: string;
        productId: string;
      };

      console.log(`[ProductDescriptionWorker] Processing message ${record.messageId}:`, payload);

      if (payload.jobId && payload.productId) {
        await withJobDeadline(context, options =>
          Container.get(LlmClient).withConfigSnapshot(() =>
            productDescriptionJobService.executeJob(payload.jobId, payload.productId, options)
          )
        );
      }
    } catch (error) {
      console.error(`[ProductDescriptionWorker] Error processing record ${record.messageId}:`, error);
      throw error;
    }
  }
};
