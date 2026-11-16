import type { Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  executeJob: vi.fn(),
  executeResearch: vi.fn(),
  executeSearch: vi.fn(),
  executeTranslationJob: vi.fn(),
  reconcileTranslation: vi.fn(),
  withConfigSnapshot: vi.fn(async (run: () => Promise<unknown>) => run()),
}));
vi.mock('../src/config', () => ({}));
vi.mock('../src/config/database', () => ({
  createPostgresConnection: vi.fn(),
}));
vi.mock('typedi', () => ({ Container: { get: () => services } }));
vi.mock('@darun/products-domain', () => ({
  CategoryRepositoryToken: {},
  ProductResearchJobRepositoryToken: {},
}));
vi.mock('@darun/products-service', () => ({
  PRODUCT_RESEARCH_PROMPT_VERSION: 'fixture',
  ProductDescriptionJobService: class {},
  ProductResearchService: class {},
}));
vi.mock('@darun/translation-service', () => ({
  LlmSettingService: class {},
  TranslationJobService: class {},
}));
vi.mock('@darun/utils-llm', async importOriginal => ({
  ...(await importOriginal<typeof import('@darun/utils-llm')>()),
  BraveSearchClient: class {},
  LlmClient: class {},
}));
vi.mock('../src/adapters/PostgresqlProductContentSync', () => ({
  PostgresqlProductContentSync: class {},
}));

import { handler as contentSyncWorker } from '../src/functions/product-content-sync-worker';
import { handler as descriptionWorker } from '../src/functions/product-description-worker';
import { handler as researchWorker } from '../src/functions/product-research-worker';
import { handler as translationWorker } from '../src/functions/translation-worker';

function deliver(worker: SQSHandler, body: string) {
  return worker(
    {
      Records: [
        {
          body,
          messageId: 'fixture-message',
          attributes: { ApproximateReceiveCount: '2' },
          eventSourceARN: 'arn:aws:sqs:ap-northeast-2:123456789012:fixture-queue',
        },
      ],
    } as SQSEvent,
    { getRemainingTimeInMillis: () => 300_000 } as Context,
    () => {}
  );
}

describe('job queue worker delivery', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it.each([
    ['description', descriptionWorker, '{"jobId":"job"}', services.executeJob],
    ['research', researchWorker, '{"jobId":42}', services.executeResearch],
    [
      'translation',
      translationWorker,
      '{"jobId":"job","entityType":"Product","entityId":42}',
      services.executeTranslationJob,
    ],
    ['content sync', contentSyncWorker, '{"intentId":""}', services.executeSearch],
  ] as const)('%s rejects an invalid identity before the business operation', async (_name, worker, body, execute) => {
    await expect(deliver(worker, body)).rejects.toThrow(/payload|IDENTITY_INVALID/);
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails a malformed delivery and logs its SQS identity without the message body', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const marker = 'private-fixture-body';
    await expect(deliver(contentSyncWorker, marker)).rejects.toThrow('Invalid SQS message body');
    expect(errorLog).toHaveBeenCalledWith(expect.any(String), {
      messageId: 'fixture-message',
      receiveCount: '2',
      queueArn: 'arn:aws:sqs:ap-northeast-2:123456789012:fixture-queue',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(marker);
    expect(services.executeSearch).not.toHaveBeenCalled();
  });

  it('lets a transport delivery retry after the business operation throws', async () => {
    services.executeSearch.mockRejectedValueOnce(new Error('temporary outage')).mockResolvedValueOnce(undefined);
    await expect(deliver(contentSyncWorker, '{"intentId":"pending-intent"}')).rejects.toThrow('temporary outage');
    await expect(deliver(contentSyncWorker, '{"intentId":"pending-intent"}')).resolves.toBeUndefined();
    expect(services.executeSearch.mock.calls).toEqual([['pending-intent'], ['pending-intent']]);
  });
});
