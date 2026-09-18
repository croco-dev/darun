import { describe, expect, it, vi } from 'vitest';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { AddProductScreenshot } from '../usecases/AddProductScreenshot';
import { UpdateProductScreenshot } from '../usecases/UpdateProductScreenshot';

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

describe('screenshot metadata normalization (add + update share one policy)', () => {
  it('신규 필드 없는 기존 유효 생성 입력은 메타데이터 NULL로 저장된다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.insert.mockImplementation(async (screenshot: ProductScreenshot) => screenshot);
    const useCase = new AddProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await useCase.execute({
      productId: 'product-1',
      imageUrl: 'https://example.com/a.png',
      imageAlt: '  메인 화면  ',
    });

    const saved = mockRepository.insert.mock.calls[0][0] as ProductScreenshot;
    expect(saved.title).toBeNull();
    expect(saved.platform).toBeNull();
    expect(saved.screenType).toBeNull();
    expect(saved.imageAlt).toBe('메인 화면');
  });

  it('공백 title은 NULL로 저장되고 유효값은 trim 후 저장된다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.insert.mockImplementation(async (screenshot: ProductScreenshot) => screenshot);
    const useCase = new AddProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await useCase.execute({
      productId: 'product-1',
      imageUrl: 'https://example.com/a.png',
      imageAlt: 'alt',
      title: '   ',
    });
    expect((mockRepository.insert.mock.calls[0][0] as ProductScreenshot).title).toBeNull();

    await useCase.execute({
      productId: 'product-1',
      imageUrl: 'https://example.com/a.png',
      imageAlt: 'alt',
      title: '  로그인 화면  ',
    });
    expect((mockRepository.insert.mock.calls[1][0] as ProductScreenshot).title).toBe('로그인 화면');
  });

  it('101자 title은 DB 작업 없이 product/invalid-args로 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new AddProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await expect(
      useCase.execute({
        productId: 'product-1',
        imageUrl: 'https://example.com/a.png',
        imageAlt: 'alt',
        title: '가'.repeat(101),
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
    expect(mockRepository.insert).not.toHaveBeenCalled();
  });

  it('imageAlt는 trim 후 1~100자로 검증된다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new AddProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await expect(
      useCase.execute({
        productId: 'product-1',
        imageUrl: 'https://example.com/a.png',
        imageAlt: '   ',
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });

    await expect(
      useCase.execute({
        productId: 'product-1',
        imageUrl: 'https://example.com/a.png',
        imageAlt: 'a'.repeat(101),
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });

    expect(mockRepository.insert).not.toHaveBeenCalled();
  });

  it('잘못된 enum 값은 DB 작업 없이 invalid-args로 거절된다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new AddProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await expect(
      useCase.execute({
        productId: 'product-1',
        imageUrl: 'https://example.com/a.png',
        imageAlt: 'alt',
        platform: 'WINDOWS_PHONE' as string,
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });

    await expect(
      useCase.execute({
        productId: 'product-1',
        imageUrl: 'https://example.com/a.png',
        imageAlt: 'alt',
        screenType: 'SPLASH' as string,
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });

    expect(mockRepository.insert).not.toHaveBeenCalled();
  });

  it('update는 기존 행의 id/imageUrl/productId를 유지하고 메타데이터만 교체한다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.updateById.mockImplementation(
      async (id: string, modifier: (s: ProductScreenshot) => ProductScreenshot) =>
        modifier(
          new ProductScreenshot({
            id,
            imageUrl: 'https://example.com/keep.png',
            imageAlt: '기존 alt',
            productId: 'product-1',
            title: '기존 제목',
            platform: 'WEB',
            screenType: 'HOME',
          })
        )
    );
    const useCase = new UpdateProductScreenshot(
      mockRepository as unknown as ProductScreenshotRepository,
      { findFlowIdsByScreenshotId: vi.fn().mockResolvedValue([]) } as never
    );

    const updated = await useCase.execute({
      id: 'screenshot-1',
      imageAlt: '새 alt',
      title: '  새 제목  ',
      platform: null,
      screenType: null,
    });

    expect(updated.id).toBe('screenshot-1');
    expect(updated.imageUrl).toBe('https://example.com/keep.png');
    expect(updated.productId).toBe('product-1');
    expect(updated.imageAlt).toBe('새 alt');
    expect(updated.title).toBe('새 제목');
    expect(updated.platform).toBeNull();
    expect(updated.screenType).toBeNull();
  });
});
