// @vitest-environment node

import 'reflect-metadata';
import { GetProduct, type ProductRepository } from '@darun/products-domain';
import { LlmTranslationProvider } from '@darun/translation-datasource';
import type {
  TranslationJobEntity,
  TranslationJobRepository,
  TranslationSourceSnapshot,
  TranslationSourceStore,
} from '@darun/translation-domain';
import { TranslationJobService, TranslationQueueService } from '@darun/translation-service';
import { LlmClient } from '@darun/utils-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const job: TranslationJobEntity = {
  id: 'job-1',
  entityType: 'Magazine',
  entityId: 'magazine-1',
  locale: 'en',
  fields: ['title'],
  status: 'pending',
  leaseToken: null,
  leaseUntil: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const snapshot: TranslationSourceSnapshot = {
  entityType: 'Magazine',
  entityId: 'magazine-1',
  fields: ['title'],
  sourceHash: 'server-snapshot',
  values: [
    {
      entityType: 'Magazine',
      entityId: 'magazine-1',
      field: 'title',
      value: '한국어 제목',
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('translation job completion reasons', () => {
  it.each([
    ['stop', null, 'completed'],
    ['length', null, 'failed'],
    ['content_filter', null, 'failed'],
    ['stop', 'I cannot provide that translation.', 'failed'],
  ] as const)(
    '%s/refusal SDK response has the expected translation job outcome',
    async (finishReason, refusal, status) => {
      const fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          Response.json({
            choices: [
              {
                finish_reason: finishReason,
                message: { role: 'assistant', content: 'Translated', refusal },
              },
            ],
          })
        )
      );
      vi.stubGlobal('fetch', fetch);
      const llm = new LlmClient({
        getConfig: async () => ({
          endpoint: 'https://synthetic.invalid/v1',
          apiKey: 'synthetic-key',
          model: 'fixture',
        }),
      });
      const productRepository = { findOneById: vi.fn() } as unknown as ProductRepository;
      const repository: TranslationJobRepository = {
        createJob: vi.fn(),
        findJobById: vi.fn().mockResolvedValue(job),
        claimJobLease: vi.fn().mockResolvedValue({ ...job, status: 'in_progress' }),
        retryJobLease: vi.fn(),
        completeJobLease: vi.fn(),
        findRecoverableJobs: vi.fn(),
        findJobs: vi.fn(),
      };
      const sourceStore: TranslationSourceStore = {
        read: vi.fn().mockResolvedValue(snapshot),
        commit: vi.fn().mockResolvedValue('completed'),
        createRetryJob: vi.fn(),
      };
      const service = new TranslationJobService(
        new GetProduct(productRepository),
        new LlmTranslationProvider(llm),
        repository,
        sourceStore,
        new TranslationQueueService()
      );

      await service.executeTranslationJob(
        'job-1',
        { entityType: 'Magazine', entityId: 'magazine-1' },
        { leaseToken: 'attempt-1' }
      );

      if (status === 'completed') {
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(sourceStore.commit).toHaveBeenCalledOnce();
        expect(repository.completeJobLease).not.toHaveBeenCalled();
      } else {
        expect(fetch).toHaveBeenCalledOnce();
        expect(sourceStore.commit).not.toHaveBeenCalled();
        expect(repository.completeJobLease).toHaveBeenCalledWith(
          'job-1',
          'attempt-1',
          'failed',
          expect.objectContaining({ message: '번역에 실패했습니다.' })
        );
      }
    }
  );
});
