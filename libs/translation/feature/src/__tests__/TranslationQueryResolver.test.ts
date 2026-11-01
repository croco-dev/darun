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
      {
        entityType: 'Magazine',
        entityId: 'm',
        field: 'title',
        value: '새 제목',
      },
      {
        entityType: 'Magazine',
        entityId: 'm',
        field: 'summary',
        value: '원문 요약',
      },
      {
        entityType: 'Magazine',
        entityId: 'm',
        field: 'content',
        value: '<p>본문</p>',
      },
    ];
    const findMany = vi.fn().mockResolvedValueOnce([
      { ...values[1], sourceHash: null },
      {
        ...values[2],
        sourceHash: createHash('sha256').update('<p>옛 본문</p>').digest('hex'),
      },
    ]);
    const read = vi.fn().mockResolvedValue({ values });
    const query = new TranslationQueryResolver({} as never, { findMany } as never, { read } as never);
    expect(
      (await query.translationFreshness('Magazine', 'm', ['title', 'summary', 'content'])).map(row => row.status)
    ).toEqual(['missing', 'stale', 'stale']);
    read.mockResolvedValue({
      values: [
        { ...values[0], value: '현재 제목' },
        { ...values[1], value: '' },
      ],
    });
    findMany.mockResolvedValue([
      {
        ...values[0],
        sourceHash: createHash('sha256').update('현재 제목').digest('hex'),
      },
    ]);
    expect((await query.translationFreshness('Magazine', 'm', ['title', 'summary'])).map(row => row.status)).toEqual([
      'current',
      'current',
    ]);
    await expect(query.translationFreshness('Unsupported', 'm', ['title'])).rejects.toThrow();
  });

  it('종류·ID·필드로 번역을 구분하고 원문 순서와 빈 필수 이름의 missing 판정을 유지한다', async () => {
    const values = [
      {
        entityType: 'ProductFeature',
        entityId: 'shared',
        field: 'summary',
        value: '기능 요약',
      },
      {
        entityType: 'Product',
        entityId: 'shared',
        field: 'name',
        value: '상품명',
      },
      {
        entityType: 'ProductFeature',
        entityId: 'shared',
        field: 'name',
        value: '기능명',
      },
      {
        entityType: 'ProductFeature',
        entityId: 'other',
        field: 'name',
        value: '다른 기능',
      },
      {
        entityType: 'Product',
        entityId: 'shared',
        field: 'summary',
        value: ' \n ',
      },
      {
        entityType: 'ProductFeature',
        entityId: 'empty',
        field: 'name',
        value: '',
      },
    ];
    const findMany = vi.fn(async ({ entityType }: { entityType: string }) =>
      entityType === 'Product'
        ? [
            {
              ...values[1],
              sourceHash: createHash('sha256').update('상품명').digest('hex'),
            },
          ]
        : [
            { ...values[2], sourceHash: null },
            {
              ...values[0],
              sourceHash: createHash('sha256').update('기능 요약').digest('hex'),
            },
          ]
    );
    const read = vi.fn().mockResolvedValue({ values });
    const query = new TranslationQueryResolver({} as never, { findMany } as never, { read } as never);

    expect(await query.translationFreshness('Product', 'shared', ['name', 'summary', 'features'])).toEqual(
      ['current', 'current', 'stale', 'missing', 'current', 'missing'].map((status, index) => ({
        entityType: values[index]!.entityType,
        entityId: values[index]!.entityId,
        field: values[index]!.field,
        status,
      }))
    );
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledWith({
      entityType: 'Product',
      locale: 'en',
      entities: [{ entityId: 'shared', field: 'name' }],
    });
    expect(findMany).toHaveBeenCalledWith({
      entityType: 'ProductFeature',
      locale: 'en',
      entities: [
        { entityId: 'shared', field: 'summary' },
        { entityId: 'shared', field: 'name' },
        { entityId: 'other', field: 'name' },
        { entityId: 'empty', field: 'name' },
      ],
    });
  });

  it('빈 snapshot과 빈 선택 필드만 있는 요청은 번역을 조회하지 않는다', async () => {
    const findMany = vi.fn();
    const read = vi
      .fn()
      .mockResolvedValueOnce({ values: [] })
      .mockResolvedValueOnce({
        values: [
          {
            entityType: 'Product',
            entityId: 'p',
            field: 'description',
            value: ' \n ',
          },
        ],
      });
    const query = new TranslationQueryResolver({} as never, { findMany } as never, { read } as never);
    expect(await query.translationFreshness('Product', 'p', [])).toEqual([]);
    expect(await query.translationFreshness('Product', 'p', ['description'])).toEqual([
      {
        entityType: 'Product',
        entityId: 'p',
        field: 'description',
        status: 'current',
      },
    ]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('원문 또는 일괄 번역 조회 장애를 상태로 숨기지 않고 전파한다', async () => {
    const failure = new Error('database unavailable');
    const findMany = vi.fn().mockRejectedValue(failure);
    const read = vi.fn().mockResolvedValue({
      values: [{ entityType: 'Product', entityId: 'p', field: 'name', value: '상품' }],
    });
    const query = new TranslationQueryResolver({} as never, { findMany } as never, { read } as never);
    await expect(query.translationFreshness('Product', 'p', ['name'])).rejects.toBe(failure);
    read.mockRejectedValue(failure);
    await expect(query.translationFreshness('Product', 'p', ['name'])).rejects.toBe(failure);
  });
});
