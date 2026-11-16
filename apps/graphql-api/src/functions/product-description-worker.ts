import 'reflect-metadata';
import '../config';
import { ProductDescriptionJobService } from '@darun/products-service';
import { LlmClient } from '@darun/utils-llm';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { createPostgresConnection } from '../config/database';
import { withJobDeadline } from './jobDeadline';
import { isQueueId, processJobQueueMessages } from './processJobQueueMessages';

export const handler: SQSHandler = async (event: SQSEvent, context): Promise<void> => {
  createPostgresConnection();

  const productDescriptionJobService = Container.get(ProductDescriptionJobService);

  await processJobQueueMessages(event.Records, async ({ jobId, productId }) => {
    if (!isQueueId(jobId) || !isQueueId(productId)) {
      throw new Error('Invalid product description queue payload');
    }

    await withJobDeadline(context, options =>
      Container.get(LlmClient).withConfigSnapshot(() =>
        productDescriptionJobService.executeJob(jobId, productId, options)
      )
    );
  });
};
