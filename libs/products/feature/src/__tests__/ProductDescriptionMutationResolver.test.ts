import 'reflect-metadata';
import type { ProductDescriptionJobService } from '@darun/products-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionMutationResolver } from '../ProductDescription.mutation.resolver';

vi.mock('typedi', () => ({ Service: () => () => {} }));
vi.mock('@darun/utils-apollo-server', () => ({ AuthRole: { Admin: 'Admin' } }));
vi.mock('type-graphql', () => {
  const dummyDecorator = () => () => {};
  return {
    Arg: dummyDecorator,
    Authorized: dummyDecorator,
    Field: dummyDecorator,
    ID: 'ID',
    ObjectType: dummyDecorator,
    Mutation: dummyDecorator,
    Resolver: dummyDecorator,
  };
});

describe('ProductDescriptionMutationResolver', () => {
  const retryJobMock = vi.fn();
  const resolver = new ProductDescriptionMutationResolver({
    retryProductDescriptionJob: retryJobMock,
  } as unknown as ProductDescriptionJobService);

  beforeEach(() => {
    retryJobMock.mockReset();
  });

  it('retries product description job and returns updated entity', async () => {
    const timestamp = new Date('2026-09-17T00:00:00Z');
    retryJobMock.mockResolvedValueOnce({
      id: 'job-1',
      productId: 'prod-1',
      status: 'pending',
      message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const result = await resolver.retryProductDescriptionJob('job-1');

    expect(retryJobMock).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({
      id: 'job-1',
      productId: 'prod-1',
      status: 'pending',
      message: 'AI 소개 생성 작업이 재시도 대기열에 등록되었습니다.',
      error: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
});
