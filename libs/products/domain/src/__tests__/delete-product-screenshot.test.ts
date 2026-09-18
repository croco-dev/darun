import { describe, expect, it, vi } from 'vitest';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { ProductFlowError } from '../errors/productFlowError';
import { DeleteProductScreenshot } from '../usecases/DeleteProductScreenshot';

const createScreenshot = (overrides: Partial<ProductScreenshot> = {}) =>
  new ProductScreenshot({
    id: 'screenshot-1',
    productId: 'product-1',
    imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/folder/image.png',
    imageAlt: 'Test image',
    ...overrides,
  });

const createMockRepositories = (screenshot: ProductScreenshot | null) => {
  const screenshotRepository = {
    findById: vi.fn().mockResolvedValue(screenshot),
    deleteWithLock: vi
      .fn()
      .mockImplementation(async (_id: string, validateLocked: (locked: ProductScreenshot) => Promise<void>) => {
        if (screenshot) {
          await validateLocked(screenshot);
        }
      }),
    deleteById: vi.fn(),
    findManyByProductIdSortByPriorityDesc: vi.fn(),
    insert: vi.fn(),
    updateById: vi.fn(),
    findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn(),
    findVisualPublishedById: vi.fn(),
    countVisualPublishedByFilter: vi.fn(),
  };
  const flowRepository = {
    findFlowIdsByScreenshotId: vi.fn().mockResolvedValue([]),
  };
  return { screenshotRepository, flowRepository };
};

describe('DeleteProductScreenshot', () => {
  it('참조 플로가 없으면 잠금 검증 통과 후 원격 이미지와 행을 삭제한다', async () => {
    const mockScreenshot = createScreenshot();
    const { screenshotRepository, flowRepository } = createMockRepositories(mockScreenshot);

    const mockImageDeleter = {
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await useCase.execute('screenshot-1');

    expect(screenshotRepository.findById).toHaveBeenCalledWith('screenshot-1');
    expect(flowRepository.findFlowIdsByScreenshotId).toHaveBeenCalledWith('screenshot-1');
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(mockScreenshot.imageUrl);
    expect(screenshotRepository.deleteWithLock).toHaveBeenCalled();
  });

  it('미참조 상태에서 잠금 안 참조가 생기면 in-use로 거절하고 원격 이미지를 삭제하지 않는다', async () => {
    const mockScreenshot = createScreenshot();
    const { screenshotRepository, flowRepository } = createMockRepositories(mockScreenshot);
    // 잠금 트랜잭션 안에서 참조가 생긴 상황: 최초 조회는 비어 있고 잠금 안에서는 참조가 있다.
    flowRepository.findFlowIdsByScreenshotId.mockResolvedValueOnce([]).mockResolvedValueOnce(['flow-1']);

    const mockImageDeleter = {
      delete: vi.fn(),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await expect(useCase.execute('screenshot-1')).rejects.toMatchObject({
      code: ProductFlowError.ScreenshotInUse,
    });

    expect(mockImageDeleter.delete).not.toHaveBeenCalled();
    expect(screenshotRepository.deleteById).not.toHaveBeenCalled();
  });

  it('플로가 화면을 참조 중이면 잠금 진입 전에도 in-use로 거절한다', async () => {
    const mockScreenshot = createScreenshot();
    const { screenshotRepository, flowRepository } = createMockRepositories(mockScreenshot);
    flowRepository.findFlowIdsByScreenshotId.mockResolvedValue(['flow-1']);

    const mockImageDeleter = {
      delete: vi.fn(),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await expect(useCase.execute('screenshot-1')).rejects.toMatchObject({
      code: ProductFlowError.ScreenshotInUse,
    });

    expect(screenshotRepository.deleteWithLock).not.toHaveBeenCalled();
    expect(mockImageDeleter.delete).not.toHaveBeenCalled();
  });

  it('화면이 없으면 not-found로 실패한다', async () => {
    const { screenshotRepository, flowRepository } = createMockRepositories(null);

    const mockImageDeleter = {
      delete: vi.fn(),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await expect(useCase.execute('screenshot-1')).rejects.toMatchObject({
      code: 'product-screenshot/not-found',
    });

    expect(screenshotRepository.deleteWithLock).not.toHaveBeenCalled();
    expect(mockImageDeleter.delete).not.toHaveBeenCalled();
  });

  it('외부 이미지 삭제 실패는 실패 응답으로 이어지고 DB 행 삭제를 호출하지 않는다', async () => {
    const mockScreenshot = createScreenshot();
    const { screenshotRepository, flowRepository } = createMockRepositories(mockScreenshot);

    const mockImageDeleter = {
      delete: vi.fn().mockRejectedValue(new Error('Cloudinary error')),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await expect(useCase.execute('screenshot-1')).rejects.toThrow('Cloudinary error');

    expect(screenshotRepository.deleteById).not.toHaveBeenCalled();
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(mockScreenshot.imageUrl);
  });

  it('원격 이미지가 이미 없어도 잠금 검증을 통과하면 삭제를 완료한다', async () => {
    const mockScreenshot = createScreenshot();
    const { screenshotRepository, flowRepository } = createMockRepositories(mockScreenshot);

    const mockImageDeleter = {
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new DeleteProductScreenshot(
      screenshotRepository as never,
      flowRepository as never,
      mockImageDeleter
    );

    await useCase.execute('screenshot-1');

    expect(screenshotRepository.deleteWithLock).toHaveBeenCalledWith('screenshot-1', expect.any(Function));
    expect(mockImageDeleter.delete).toHaveBeenCalledWith(mockScreenshot.imageUrl);
  });
});
