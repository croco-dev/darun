import 'reflect-metadata';
import type { ProductDescriptionJobService } from '@darun/products-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionQueryResolver } from '../ProductDescription.query.resolver';

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
    Query: dummyDecorator,
    Resolver: dummyDecorator,
  };
});

describe('ProductDescriptionQueryResolver', () => {
  const getJobMock = vi.fn();
  const resolver = new ProductDescriptionQueryResolver({
    getJob: getJobMock,
  } as unknown as ProductDescriptionJobService);

  beforeEach(() => {
    getJobMock.mockReset();
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
    const listResolver = new ProductDescriptionQueryResolver({
      getJob: vi.fn(),
      getJobs: getJobsMock,
    } as unknown as ProductDescriptionJobService);

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
