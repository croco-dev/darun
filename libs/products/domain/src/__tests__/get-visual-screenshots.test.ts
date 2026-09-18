import { describe, expect, it, vi } from 'vitest';
import type {
  ProductScreenshotRepository,
  VisualScreenshotFilter,
  VisualScreenshotWithProduct,
} from '../repositories/ProductScreenshotRepository';
import { GetVisualScreenshots, VISUAL_SCREENSHOTS_MAX_FIRST } from '../usecases/GetVisualScreenshots';

const createScreenshot = (overrides: Partial<VisualScreenshotWithProduct> = {}): VisualScreenshotWithProduct => ({
  id: '01HW0000000000000000000000',
  imageUrl: 'https://example.com/a.png',
  imageAlt: 'alt',
  productId: 'product-1',
  title: null,
  platform: null,
  screenType: null,
  productName: '다런',
  productSlug: 'darun',
  productSummary: '요약',
  productLogoUrl: 'https://example.com/logo.png',
  ...overrides,
});

const createMockRepository = () => ({
  findById: vi.fn(),
  findManyByProductIdSortByPriorityDesc: vi.fn(),
  insert: vi.fn(),
  deleteById: vi.fn(),
  updateById: vi.fn(),
  findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn(),
  findVisualPublishedById: vi.fn(),
  countVisualPublishedByFilter: vi.fn(),
});

describe('GetVisualScreenshots', () => {
  it('first 1~48 범위 밖은 DB 접근 없이 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new GetVisualScreenshots(mockRepository as unknown as ProductScreenshotRepository);

    await expect(useCase.execute({ first: 0 })).rejects.toThrow('pagination/invalid-connection-args');
    await expect(useCase.execute({ first: VISUAL_SCREENSHOTS_MAX_FIRST + 1 })).rejects.toThrow(
      'pagination/invalid-connection-args'
    );
    expect(mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit).not.toHaveBeenCalled();
    expect(mockRepository.countVisualPublishedByFilter).not.toHaveBeenCalled();
  });

  it('trim 후 100자 이하 query는 통과하고 101자는 자르지 않고 거절한다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit.mockResolvedValue([]);
    mockRepository.countVisualPublishedByFilter.mockResolvedValue(0);
    const useCase = new GetVisualScreenshots(mockRepository as unknown as ProductScreenshotRepository);

    await useCase.execute({ query: '  ' + '가'.repeat(100) + '  ', first: 24 });
    const filter = mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit.mock
      .calls[0][0] as VisualScreenshotFilter;
    expect(filter.query).toBe('가'.repeat(100));

    await expect(useCase.execute({ query: '가'.repeat(101), first: 24 })).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
  });

  it('SQL 필터 뒤 페이지를 자른다: 24건 초과 시 24건만 반환하고 hasNextPage를 알린다', async () => {
    const mockRepository = createMockRepository();
    const twentyFive = Array.from({ length: 25 }, (_, i) =>
      createScreenshot({ id: `01HW00000000000000000000${String(i).padStart(2, '0')}` })
    );
    mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit.mockImplementation(
      async (filter: VisualScreenshotFilter, limit: number) => twentyFive.slice(0, limit)
    );
    mockRepository.countVisualPublishedByFilter.mockResolvedValue(25);
    const useCase = new GetVisualScreenshots(mockRepository as unknown as ProductScreenshotRepository);

    const result = await useCase.execute({ first: 24 });

    expect(mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit).toHaveBeenCalledWith(
      expect.anything(),
      25,
      undefined
    );
    expect(result.screenshots).toHaveLength(24);
    expect(result.hasNextPage).toBe(true);
    expect(result.totalCount).toBe(25);
  });

  it('정확히 24건이면 hasNextPage가 false다', async () => {
    const mockRepository = createMockRepository();
    const twentyFour = Array.from({ length: 24 }, (_, i) =>
      createScreenshot({ id: `01HW00000000000000000000${String(i).padStart(2, '0')}` })
    );
    mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit.mockResolvedValue(twentyFour);
    mockRepository.countVisualPublishedByFilter.mockResolvedValue(24);
    const useCase = new GetVisualScreenshots(mockRepository as unknown as ProductScreenshotRepository);

    const result = await useCase.execute({ first: 24 });

    expect(result.screenshots).toHaveLength(24);
    expect(result.hasNextPage).toBe(false);
  });

  it('잘못된 platform/screenType 필터는 DB 접근 없이 invalid-args로 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new GetVisualScreenshots(mockRepository as unknown as ProductScreenshotRepository);

    await expect(useCase.execute({ platform: 'WINDOWS_PHONE' as string, first: 24 })).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
    await expect(useCase.execute({ screenType: 'SPLASH' as string, first: 24 })).rejects.toMatchObject({
      code: 'product/invalid-args',
    });
    expect(mockRepository.findManyVisualPublishedByFilterAndAfterIdAndLimit).not.toHaveBeenCalled();
  });
});
