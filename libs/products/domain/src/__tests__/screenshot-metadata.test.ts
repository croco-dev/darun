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
  findManyVisualPublishedByFilterAndPageAndLimit: vi.fn(),
  findVisualPublishedById: vi.fn(),
  countVisualPublishedByFilter: vi.fn(),
  insertVisualViewEvent: vi.fn().mockResolvedValue(true),
  toggleVisualSave: vi.fn().mockResolvedValue({ saved: true }),
  isVisualSaved: vi.fn().mockResolvedValue(false),
  findVisualSavesByUser: vi.fn().mockResolvedValue({ screenshotIds: [], flowIds: [], totalCount: 0 }),
  replaceScreenshotUiElements: vi.fn().mockResolvedValue([]),
  findScreenshotUiElementsByScreenshotIds: vi.fn().mockResolvedValue({}),
});

describe('screenshot metadata normalization', () => {
  it.each([
    {
      name: '생략',
      patch: {},
      expected: { title: '기존 제목', platform: 'WEB', screenType: 'HOME' },
    },
    {
      name: '명시적 null',
      patch: { title: null, platform: null, screenType: null },
      expected: { title: null, platform: null, screenType: null },
    },
    {
      name: '동일값',
      patch: { title: '기존 제목', platform: 'WEB', screenType: 'HOME' },
      expected: { title: '기존 제목', platform: 'WEB', screenType: 'HOME' },
    },
    {
      name: '변경값',
      patch: { title: '  새 제목  ', platform: 'IOS', screenType: 'SIGN_IN' },
      expected: { title: '새 제목', platform: 'IOS', screenType: 'SIGN_IN' },
    },
    {
      name: '일부 필드',
      patch: { title: null },
      expected: { title: null, platform: 'WEB', screenType: 'HOME' },
    },
  ])('수정의 $name 입력은 잠긴 행에서 선택한 필드만 바꾼다', async ({ patch, expected }) => {
    const repository = createMockRepository();
    const current = new ProductScreenshot({
      id: 'screen-1',
      productId: 'product-1',
      imageUrl: 'https://example.com/keep.png',
      imageAlt: '이전 alt',
      title: '기존 제목',
      platform: 'WEB',
      screenType: 'HOME',
    });
    repository.findById.mockRejectedValue(new Error('잠금 이전 읽기는 사용하지 않는다'));
    const findReferencingFlowIds = vi.fn().mockResolvedValue([]);
    repository.updateById.mockImplementation(async (_id, modifier, validateLocked) => {
      await validateLocked(current, findReferencingFlowIds);
      return modifier(current);
    });

    const useCase = new UpdateProductScreenshot(repository as unknown as ProductScreenshotRepository);
    const updated = await useCase.execute({
      id: current.id,
      imageAlt: '  새 alt  ',
      ...patch,
    });
    expect(updated).toMatchObject({
      ...expected,
      id: current.id,
      productId: 'product-1',
      imageUrl: current.imageUrl,
      imageAlt: '새 alt',
    });
    expect(findReferencingFlowIds).toHaveBeenCalledTimes(expected.platform === 'WEB' ? 0 : 1);
  });

  it.each([undefined, 'WEB', null, 'IOS'])(
    '참조 중인 화면의 platform=%j는 실제 변경일 때만 거절한다',
    async platform => {
      const repository = createMockRepository();
      const current = new ProductScreenshot({
        id: 'screen-1',
        productId: 'product-1',
        imageUrl: 'https://example.com/keep.png',
        imageAlt: '기존 alt',
        title: '기존 제목',
        platform: 'WEB',
        screenType: 'HOME',
      });
      const findReferencingFlowIds = vi.fn().mockResolvedValue(['flow-1']);
      const persisted = vi.fn();
      repository.updateById.mockImplementation(async (_id, modifier, validateLocked) => {
        await validateLocked(current, findReferencingFlowIds);
        const next = modifier(current);
        persisted(next);
        return next;
      });
      const useCase = new UpdateProductScreenshot(repository as unknown as ProductScreenshotRepository);
      const result = useCase.execute({
        id: current.id,
        imageAlt: '새 alt',
        platform,
      });
      if (platform === undefined || platform === 'WEB') {
        await expect(result).resolves.toMatchObject({
          title: '기존 제목',
          platform: 'WEB',
          screenType: 'HOME',
          imageAlt: '새 alt',
        });
      } else {
        await expect(result).rejects.toMatchObject({
          code: 'product-screenshot/in-use',
        });
        expect(persisted).not.toHaveBeenCalled();
      }
    }
  );

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

  it('update에 uiElements를 주면 정규화 후 조인 태그를 교체한다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.updateById.mockImplementation(
      async (id: string, modifier: (s: ProductScreenshot) => ProductScreenshot) =>
        modifier(
          new ProductScreenshot({
            id,
            imageUrl: 'https://example.com/keep.png',
            imageAlt: '기존 alt',
            productId: 'product-1',
          })
        )
    );
    const useCase = new UpdateProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    const updated = await useCase.execute({
      id: 'screenshot-1',
      imageAlt: '새 alt',
      uiElements: ['CARD', 'BUTTON', 'CARD'],
    });

    expect(updated.imageAlt).toBe('새 alt');
    expect(mockRepository.updateById).toHaveBeenCalledWith('screenshot-1', expect.any(Function), expect.any(Function), [
      'CARD',
      'BUTTON',
    ]);
    expect(mockRepository.replaceScreenshotUiElements).not.toHaveBeenCalled();
  });

  it('update에 잘못된 uiElements를 주면 DB 작업 없이 invalid-args로 거절한다', async () => {
    const mockRepository = createMockRepository();
    const useCase = new UpdateProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await expect(
      useCase.execute({
        id: 'screenshot-1',
        imageAlt: '새 alt',
        uiElements: ['SIDEBAR'],
      })
    ).rejects.toMatchObject({ code: 'product/invalid-args' });
    expect(mockRepository.updateById).not.toHaveBeenCalled();
  });

  it('update에 uiElements를 생략하면 조인 태그를 건드리지 않는다', async () => {
    const mockRepository = createMockRepository();
    mockRepository.updateById.mockImplementation(
      async (id: string, modifier: (s: ProductScreenshot) => ProductScreenshot) =>
        modifier(
          new ProductScreenshot({
            id,
            imageUrl: 'https://example.com/keep.png',
            imageAlt: '기존 alt',
            productId: 'product-1',
          })
        )
    );
    vi.mocked(mockRepository.replaceScreenshotUiElements).mockClear();
    const useCase = new UpdateProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

    await useCase.execute({ id: 'screenshot-1', imageAlt: '새 alt' });

    expect(mockRepository.updateById).toHaveBeenCalledWith(
      'screenshot-1',
      expect.any(Function),
      expect.any(Function),
      undefined
    );
    expect(mockRepository.replaceScreenshotUiElements).not.toHaveBeenCalled();
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
    const useCase = new UpdateProductScreenshot(mockRepository as unknown as ProductScreenshotRepository);

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
