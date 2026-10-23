import 'reflect-metadata';
import '../config';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlProductContentSync } from '../adapters/PostgresqlProductContentSync';
import { createPostgresConnection } from '../config/database';

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  createPostgresConnection();
  const sync = Container.get(PostgresqlProductContentSync);
  for (const record of event.Records) {
    const payload: unknown = JSON.parse(record.body);
    if (!payload || typeof payload !== 'object' || !('intentId' in payload) || typeof payload.intentId !== 'string')
      throw new Error('CONTENT_SYNC_QUEUE_IDENTITY_INVALID');
    await sync.executeSearch(payload.intentId);
  }
};
