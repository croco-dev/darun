import 'reflect-metadata';
import type { TranslationJobService } from '@darun/translation-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { TranslationQueryResolver } from '../Translation.query.resolver';

vi.mock('typedi', () => ({
  Service: () => () => {},
  Inject: () => () => {},
  Token: class Token {},
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
    resolver = new TranslationQueryResolver(mockJobService as TranslationJobService, {} as never, {} as never);
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
      fields: ['summary'],
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
      fields: ['summary'],
      model: undefined,
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
      fields: ['name', 'summary', 'description', 'features'],
      model: undefined,
      status: 'failed',
      message: '실패',
      error: '429 Provider error',
      createdAt: now,
      updatedAt: now,
    });
  });
  it('distinguishes missing, null provenance, changed source, current and absent optional sources', async () => {
    const values = [
      { entityType: 'Magazine', entityId: 'm', field: 'title', value: '새 제목' },
      { entityType: 'Magazine', entityId: 'm', field: 'summary', value: '원문 요약' },
      { entityType: 'Magazine', entityId: 'm', field: 'content', value: '<p>본문</p>' },
    ];
    const findOne = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ sourceHash: null })
      .mockResolvedValueOnce({ sourceHash: createHash('sha256').update('<p>옛 본문</p>').digest('hex') });
    const read = vi.fn().mockResolvedValue({ values });
    const query = new TranslationQueryResolver({} as never, { findOne } as never, { read } as never);
    expect(
      (await query.translationFreshness('Magazine', 'm', ['title', 'summary', 'content'])).map(row => row.status)
    ).toEqual(['missing', 'stale', 'stale']);
    read.mockResolvedValue({
      values: [
        { ...values[0], value: '현재 제목' },
        { ...values[1], value: '' },
      ],
    });
    findOne.mockResolvedValue({ sourceHash: createHash('sha256').update('현재 제목').digest('hex') });
    expect((await query.translationFreshness('Magazine', 'm', ['title', 'summary'])).map(row => row.status)).toEqual([
      'current',
      'current',
    ]);
    await expect(query.translationFreshness('Unsupported', 'm', ['title'])).rejects.toThrow();
  });
});
