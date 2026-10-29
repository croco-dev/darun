import type { GetProduct } from '@darun/products-domain';
import type {
  TranslationJobEntity,
  TranslationJobRepository,
  TranslationProvider,
  TranslationSourceSnapshot,
  TranslationSourceStore,
} from '@darun/translation-domain';
import { vi } from 'vitest';
import { TranslationJobService } from '../TranslationJobService';
import type { TranslationQueueService } from '../TranslationQueueService';

export function translationJobFixture(overrides: Partial<TranslationJobEntity> = {}) {
  const job: TranslationJobEntity = {
    id: 'job-1',
    entityType: 'Magazine',
    entityId: 'm1',
    locale: 'en',
    fields: ['title', 'summary'],
    status: 'pending',
    leaseToken: 'attempt-1',
    leaseUntil: new Date(Date.now() + 300_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  const snapshot: TranslationSourceSnapshot = {
    entityType: job.entityType as TranslationSourceSnapshot['entityType'],
    entityId: job.entityId,
    fields: job.fields ?? null,
    sourceHash: 'server-snapshot',
    values: [
      {
        entityType: job.entityType as TranslationSourceSnapshot['entityType'],
        entityId: job.entityId,
        field: job.entityType === 'Magazine' ? 'title' : 'name',
        value: '이름',
      },
      {
        entityType: job.entityType as TranslationSourceSnapshot['entityType'],
        entityId: job.entityId,
        field: 'summary',
        value: '한계',
      },
    ],
  };
  const repository = {
    findJobById: vi.fn().mockResolvedValue(job),
    findJobs: vi.fn().mockResolvedValue([job]),
    createJob: vi.fn().mockImplementation(async input => ({ ...job, ...input, id: 'job-new', status: 'pending' })),
    retryJobLease: vi.fn().mockResolvedValue({ ...job, status: 'pending' }),
    claimJobLease: vi.fn().mockResolvedValue({ ...job, status: 'in_progress' }),
    completeJobLease: vi.fn().mockResolvedValue({ ...job, status: 'failed' }),
    findOrCreateActiveJob: vi
      .fn()
      .mockImplementation(async input => ({ ...job, ...input, id: 'job-new', status: 'pending' })),
    findRecoverableJobs: vi.fn().mockResolvedValue([job]),
  };
  const provider = {
    translateSingle: vi.fn().mockResolvedValue({
      translatedText: 'Translated',
      sourceHash: 'untrusted-provider-hash',
      model: 'test-model',
      promptVersion: 'v2',
    }),
    translateProductBundle: vi.fn(),
  };
  const source = {
    read: vi.fn().mockResolvedValue(snapshot),
    commit: vi.fn().mockResolvedValue('completed'),
    createRetryJob: vi.fn(async (previousJobId: string) => ({
      ...job,
      id: 'job-new',
      status: 'pending' as const,
      retryOfJobId: previousJobId,
    })),
  };
  const queue = { sendJob: vi.fn().mockResolvedValue(true) };
  const getProduct = { execute: vi.fn().mockResolvedValue({ id: job.entityId }) };
  const service = new TranslationJobService(
    getProduct as unknown as GetProduct,
    provider as TranslationProvider,
    repository as TranslationJobRepository,
    source as TranslationSourceStore,
    queue as unknown as TranslationQueueService
  );
  return { service, job, snapshot, repository, provider, source, queue, getProduct };
}
