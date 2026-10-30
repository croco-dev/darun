import 'reflect-metadata';
import type { ProductDescriptionJobService } from '@darun/products-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionMutationResolver } from '../ProductDescription.mutation.resolver';
import { ProductDescriptionQueryResolver } from '../ProductDescription.query.resolver';

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

    const load = vi.fn().mockRejectedValue(new Error('Unexpected candidate read'));
    const fields = new ProductDescriptionQueryResolver({ getCandidateHtml: load } as never, {} as never, {} as never);
    expect(await fields.candidateHtml(result)).toBeNull();
    expect(load).not.toHaveBeenCalled();
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
