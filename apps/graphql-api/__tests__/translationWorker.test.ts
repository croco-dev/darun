import 'reflect-metadata';
import type { SQSEvent, Context } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  executeTranslationJob: vi.fn().mockResolvedValue(undefined),
  reconcileTranslation: vi.fn().mockResolvedValue(undefined),
  connection: vi.fn(),
  withConfigSnapshot: vi.fn(async (run: () => Promise<unknown>) => run()),
}));
vi.mock('../src/config', () => ({}));
vi.mock('../src/config/database', () => ({ createPostgresConnection: mocks.connection }));
vi.mock('typedi', () => ({ Container: { get: () => mocks } }));
vi.mock('@darun/translation-service', () => ({ TranslationJobService: class {} }));
vi.mock('../src/adapters/PostgresqlProductContentSync', () => ({ PostgresqlProductContentSync: class {} }));
import { handler } from '../src/functions/translation-worker';

describe('Actual translation SQS worker dispatch', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['Product', 'Magazine', 'ProductFeature'])(
    '%s의 영속 job을 공통 attempt executor에 전달한다',
    async entityType => {
      const payload = { jobId: 'job', entityType, entityId: 'source' };
      await handler(
        { Records: [{ messageId: 'synthetic', body: JSON.stringify(payload) }] } as SQSEvent,
        { getRemainingTimeInMillis: () => 300_000 } as Context,
        () => {}
      );
      expect(mocks.executeTranslationJob).toHaveBeenCalledWith('job', payload, {
        signal: expect.any(AbortSignal),
        deadline: expect.any(Date),
        stageBudgetMs: 255_000,
      });
      expect(mocks.reconcileTranslation).toHaveBeenCalledWith('job');
    }
  );
  it('미지원 entity 또는 잘못된 queue payload는 성공처럼 무시하지 않는다', async () => {
    await expect(
      handler(
        {
          Records: [
            { messageId: 'invalid', body: JSON.stringify({ jobId: 'job', entityType: 'Other', entityId: 'source' }) },
          ],
        } as SQSEvent,
        {} as Context,
        () => {}
      )
    ).rejects.toThrow(/Invalid translation queue payload/);
    expect(mocks.executeTranslationJob).not.toHaveBeenCalled();
  });
});
