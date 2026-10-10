import { describe, expect, it, vi } from 'vitest';
import type { ProductFlowRepository, VisualFlowSummary } from '../repositories/ProductFlowRepository';
import { GetVisualFlows, VISUAL_FLOWS_MAX_FIRST } from '../usecases/GetVisualFlows';

const createFlow = (overrides: Partial<VisualFlowSummary> = {}): VisualFlowSummary => ({
  id: '01HW0000000000000000000000',
  title: '온보딩',
  description: '',
  platform: 'IOS',
  flowType: 'ONBOARDING',
  stepCount: 3,
  coverScreenshot: { id: '01HW0000000000000000000001', imageUrl: 'https://example.com/a.png', imageAlt: 'alt' },
  productId: 'product-1',
  productName: '다런',
  productSlug: 'darun',
  ...overrides,
});

const createMockRepository = () => ({
  findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn(),
  findManyVisualPublishedByFilterAndPageAndLimit: vi.fn(),
  countVisualPublishedByFilter: vi.fn(),
});

describe('GetVisualFlows sort', () => {
  it('sort 미지정 시 LATEST로 keyset 조회를 유지한다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit.mockResolvedValue([]);
    mockRepository.countVisualPublishedByFilter.mockResolvedValue(0);
    const useCase = new GetVisualFlows(mockRepository as unknown as ProductFlowRepository);

    await useCase.execute({ first: 24 });

    expect(mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit).toHaveBeenCalledTimes(1);
    expect(mockRepository.findManyVisualPublishedByFilterAndPageAndLimit).not.toHaveBeenCalled();
  });

  it('POPULAR는 오프셋(page) 조회로 분기한다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.findManyVisualPublishedByFilterAndPageAndLimit.mockResolvedValue([createFlow()]);
    mockRepository.countVisualPublishedByFilter.mockResolvedValue(1);
    const useCase = new GetVisualFlows(mockRepository as unknown as ProductFlowRepository);

    const result = await useCase.execute({ sort: 'POPULAR', first: 24, page: 2 });

    expect(mockRepository.findManyVisualPublishedByFilterAndPageAndLimit).toHaveBeenCalledWith(
      expect.anything(),
      2,
      25
    );
    expect(mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit).not.toHaveBeenCalled();
    expect(result.flows).toHaveLength(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('POPULAR에서 page가 1 미만이면 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new GetVisualFlows(mockRepository as unknown as ProductFlowRepository);

    await expect(useCase.execute({ sort: 'POPULAR', first: 24, page: 0 })).rejects.toThrow(
      'pagination/invalid-connection-args'
    );
    expect(mockRepository.findManyVisualPublishedByFilterAndPageAndLimit).not.toHaveBeenCalled();
  });

  it('first 범위를 벗어나면 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new GetVisualFlows(mockRepository as unknown as ProductFlowRepository);

    await expect(useCase.execute({ first: 0 })).rejects.toThrow('pagination/invalid-connection-args');
    await expect(useCase.execute({ first: VISUAL_FLOWS_MAX_FIRST + 1 })).rejects.toThrow(
      'pagination/invalid-connection-args'
    );
  });
});
