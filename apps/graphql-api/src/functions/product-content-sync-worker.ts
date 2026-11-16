import 'reflect-metadata';
import '../config';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createPostgresConnection } from '../config/database';
import { isQueueId, processJobQueueMessages } from './processJobQueueMessages';

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  createPostgresConnection();
  const sync = Container.get(PostgresqlProductContentSync);
  await processJobQueueMessages(event.Records, async ({ intentId }) => {
    if (!isQueueId(intentId)) throw new Error('CONTENT_SYNC_QUEUE_IDENTITY_INVALID');
    await sync.executeSearch(intentId);
  });
};
