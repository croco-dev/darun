import 'reflect-metadata';
import '../config';
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Container } from 'typedi';
import { PostgresqlScreenshotCleanup } from '../adapters/PostgresqlScreenshotCleanup';
import { createPostgresConnection } from '../config/database';

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  createPostgresConnection();
  const cleanup = Container.get(PostgresqlScreenshotCleanup);
  for (const record of event.Records) {
    const payload: unknown = JSON.parse(record.body);
    if (!payload || typeof payload !== 'object' || !('intentId' in payload) || typeof payload.intentId !== 'string')
      throw new Error('SCREENSHOT_CLEANUP_QUEUE_IDENTITY_INVALID');
    await cleanup.execute(payload.intentId);
  }
};
