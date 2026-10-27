import { describe, expect, it, vi } from 'vitest';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { DeleteProductScreenshot } from '../usecases/DeleteProductScreenshot';

const screenshot = new ProductScreenshot({
  id: 'screenshot-1',
  productId: 'product-1',
  imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/folder/image.png',
  imageAlt: 'Test image',
});

function fixture(found: ProductScreenshot | null = screenshot) {
  const lockedReferences = vi.fn().mockResolvedValue([]);
  const screenshots = {
    findById: vi.fn().mockResolvedValue(found),
    deleteWithLock: vi.fn(
      async (
        _id: string,
        validate: (locked: ProductScreenshot, findReferences: () => Promise<string[]>) => Promise<void>
      ) => {
        await validate(screenshot, lockedReferences);
      }
    ),
  };
  const flows = { findFlowIdsByScreenshotId: vi.fn().mockResolvedValue([]) };
  return {
    screenshots,
    flows,
    lockedReferences,
    usecase: new DeleteProductScreenshot(screenshots as never, flows as never),
  };
}

describe('DeleteProductScreenshot', () => {
  it('미참조 화면은 잠금 안 검증과 원자 삭제의 commit으로 완료한다', async () => {
    const { screenshots, flows, usecase } = fixture();
    await usecase.execute(screenshot.id);
    expect(screenshots.deleteWithLock).toHaveBeenCalledWith(screenshot.id, expect.any(Function));
    expect(flows.findFlowIdsByScreenshotId).toHaveBeenCalledTimes(1);
  });

  it('잠금 이후 새로 생긴 참조도 삭제를 거절한다', async () => {
    const { lockedReferences, usecase } = fixture();
    lockedReferences.mockResolvedValue(['flow-1']);
    await expect(usecase.execute(screenshot.id)).rejects.toMatchObject({
      code: 'product-screenshot/in-use',
    });
  });

  it('기존 참조가 있으면 삭제 트랜잭션에 진입하지 않는다', async () => {
    const { screenshots, flows, usecase } = fixture();
    flows.findFlowIdsByScreenshotId.mockResolvedValue(['flow-1']);
    await expect(usecase.execute(screenshot.id)).rejects.toMatchObject({
      code: 'product-screenshot/in-use',
    });
    expect(screenshots.deleteWithLock).not.toHaveBeenCalled();
  });

  it('화면이 없으면 not-found로 실패한다', async () => {
    const { screenshots, usecase } = fixture(null);
    await expect(usecase.execute(screenshot.id)).rejects.toMatchObject({
      code: 'product-screenshot/not-found',
    });
    expect(screenshots.deleteWithLock).not.toHaveBeenCalled();
  });

  it('DB 삭제 실패는 호출자에게 전달한다', async () => {
    const { screenshots, usecase } = fixture();
    screenshots.deleteWithLock.mockRejectedValueOnce(new Error('commit failed'));
    await expect(usecase.execute(screenshot.id)).rejects.toThrow('commit failed');
  });
});
