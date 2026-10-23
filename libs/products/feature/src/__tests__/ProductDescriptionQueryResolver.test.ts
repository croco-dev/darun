import 'reflect-metadata';
import type { ProductDescriptionJobService } from '@darun/products-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionQueryResolver } from '../ProductDescription.query.resolver';

vi.mock('typedi', () => ({
  Service: () => () => {},
  Inject: () => () => {},
  Token: class Token {},
}));
vi.mock('@darun/utils-apollo-server', () => ({ AuthRole: { Admin: 'Admin' } }));
vi.mock('type-graphql', () => {
  const dummyDecorator = () => () => {};
  return {
    Arg: dummyDecorator,
    Authorized: dummyDecorator,
    Field: dummyDecorator,
    ID: 'ID',
    InputType: dummyDecorator,
    ObjectType: dummyDecorator,
    Query: dummyDecorator,
    Mutation: dummyDecorator,
    FieldResolver: dummyDecorator,
    Root: dummyDecorator,
    Resolver: dummyDecorator,
  };
});

describe('ProductDescriptionQueryResolver', () => {
  const getJobMock = vi.fn();
  const getProductMock = vi.fn();
  const resolver = new ProductDescriptionQueryResolver(
    {
      getJob: getJobMock,
    } as unknown as ProductDescriptionJobService,
    { requestSearch: vi.fn(), status: vi.fn(), latestStatus: vi.fn(), retry: vi.fn() },
    { execute: getProductMock } as never
  );

  beforeEach(() => {
    getJobMock.mockReset();
    getProductMock.mockReset();
  });

  it('reads the current Product slug and preserves the missing-product error', async () => {
    getProductMock.mockResolvedValueOnce({ slug: 'renamed-product' });
    await expect(resolver.productSlug({ productId: 'product-1' } as never)).resolves.toBe('renamed-product');
    expect(getProductMock).toHaveBeenCalledWith({ id: 'product-1', fresh: true });
    getProductMock.mockResolvedValueOnce(null);
    await expect(resolver.productSlug({ productId: 'missing' } as never)).rejects.toThrow(
      '소개 후보에 연결된 제품을 찾지 못했습니다.'
    );
  });

  it('resolves product description job by ID or null when absent', async () => {
    getJobMock.mockResolvedValueOnce(null);
    await expect(resolver.productDescriptionJob('missing-job')).resolves.toBeNull();

    const timestamp = new Date('2026-09-17T00:00:00Z');
    getJobMock.mockResolvedValueOnce({
      id: 'job-desc-1',
      productId: 'prod-abc',
      status: 'completed',
      message: 'Done',
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await expect(resolver.productDescriptionJob('job-desc-1')).resolves.toEqual({
      id: 'job-desc-1',
      productId: 'prod-abc',
      status: 'completed',
      message: 'Done',
      error: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  it('resolves product description jobs list with pagination and status filter', async () => {
    const getJobsMock = vi.fn();
    const listResolver = new ProductDescriptionQueryResolver(
      {
        getJob: vi.fn(),
        getJobs: getJobsMock,
      } as unknown as ProductDescriptionJobService,
      { requestSearch: vi.fn(), status: vi.fn(), latestStatus: vi.fn(), retry: vi.fn() },
      { execute: vi.fn() } as never
    );

    const timestamp = new Date('2026-09-17T00:00:00Z');
    getJobsMock.mockResolvedValueOnce([
      {
        id: 'job-1',
        productId: 'prod-1',
        status: 'failed',
        message: 'Failed',
        error: '429 RateLimit',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);

    const result = await listResolver.productDescriptionJobs('failed', 10, 0);

    expect(getJobsMock).toHaveBeenCalledWith({
      status: 'failed',
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'job-1',
      productId: 'prod-1',
      status: 'failed',
      message: 'Failed',
      error: '429 RateLimit',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
});
