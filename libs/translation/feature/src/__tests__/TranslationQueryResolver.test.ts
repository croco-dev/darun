import 'reflect-metadata';
import type { TranslationJobService } from '@darun/translation-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationQueryResolver } from '../Translation.query.resolver';

vi.mock('typedi', () => ({
  Service: () => () => {},
}));

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Authorized: methodDecorator,
    Query: methodDecorator,
    ObjectType: () => () => {},
    Field: () => () => {},
    ID: 'ID',
    Resolver: () => () => {},
  };
});

describe('TranslationQueryResolver', () => {
  let mockJobService: Partial<TranslationJobService>;
  let resolver: TranslationQueryResolver;

  beforeEach(() => {
    mockJobService = {
      getJob: vi.fn(),
    };
    resolver = new TranslationQueryResolver(mockJobService as TranslationJobService);
  });

  it('returns null when job is not found', async () => {
    vi.mocked(mockJobService.getJob!).mockResolvedValue(null);

    const result = await resolver.translationJob('non-existent');
    expect(result).toBeNull();
  });

  it('returns formatted TranslationJob when job is found', async () => {
    const now = new Date();
    vi.mocked(mockJobService.getJob!).mockResolvedValue({
      id: 'job-123',
      entityType: 'Product',
      entityId: 'prod-456',
      locale: 'en',
      status: 'completed',
      message: '번역 완료',
      error: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = await resolver.translationJob('job-123');
    expect(result).toEqual({
      id: 'job-123',
      entityType: 'Product',
      entityId: 'prod-456',
      locale: 'en',
      status: 'completed',
      message: '번역 완료',
      error: undefined,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('returns list of jobs for translationJobs query', async () => {
    const now = new Date();
    mockJobService.getJobs = vi.fn().mockResolvedValue([
      {
        id: 'job-1',
        entityType: 'Product',
        entityId: 'prod-1',
        locale: 'en',
        status: 'failed',
        message: '실패',
        error: '429 Provider error',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await resolver.translationJobs('failed', 10, 0);
    expect(mockJobService.getJobs).toHaveBeenCalledWith({
      status: 'failed',
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'job-1',
      entityType: 'Product',
      entityId: 'prod-1',
      locale: 'en',
      status: 'failed',
      message: '실패',
      error: '429 Provider error',
      createdAt: now,
      updatedAt: now,
    });
  });
});
