import { describe, expect, it, vi } from 'vitest';
import { ProductFlow } from '../entities/ProductFlow';
import { ProductScreenshot } from '../entities/ProductScreenshot';
import { CreateProductFlow, validateFlowSteps } from '../usecases/CreateProductFlow';
import { DeleteProductFlow } from '../usecases/DeleteProductFlow';
import { UpdateProductFlow } from '../usecases/UpdateProductFlow';

const createScreenshot = (overrides: Partial<ProductScreenshot> = {}) =>
  new ProductScreenshot({
    id: 'screenshot-a',
    imageUrl: 'https://example.com/a.png',
    imageAlt: '화면 A',
    productId: 'product-1',
    title: '회원가입',
    platform: 'WEB',
    screenType: 'SIGN_UP',
    ...overrides,
  });

const existingFlow = () =>
  new ProductFlow({
    id: 'flow-1',
    productId: 'product-1',
    title: '기존 제목',
    description: '기존 설명',
    platform: 'WEB',
    flowType: 'SIGN_UP',
    steps: [
      { screenshotId: 'screenshot-a', caption: '' },
      { screenshotId: 'screenshot-b', caption: '' },
    ],
  });

/**
 * 트랜잭션 잠금을 모사한다: 저장 시 잠긴 screenshot rows로
 * 도메인 검증기를 실행하고, 통과해야 실제 저장이 일어난다.
 */
const createMockRepositories = () => {
  const screenshots = new Map<string, ProductScreenshot>();
  const savedFlows: ProductFlow[] = [];
  const flowRepository = {
    insert: vi.fn(async (flow: ProductFlow, validateSteps: (locked: ProductScreenshot[]) => void) => {
      const locked = flow.steps
        .map(step => screenshots.get(step.screenshotId))
        .filter((s): s is ProductScreenshot => s !== undefined);
      validateSteps(locked);
      const saved = new ProductFlow({ ...flow, id: 'flow-new' });
      savedFlows.push(saved);
      return saved;
    }),
    updateById: vi.fn(
      async (
        id: string,
        modifier: (flow: ProductFlow) => ProductFlow,
        validateSteps: (locked: ProductScreenshot[], lockedFlow: ProductFlow) => void
      ) => {
        const current = existingFlow();
        const next = modifier(current);
        const locked = next.steps
          .map(step => screenshots.get(step.screenshotId))
          .filter((s): s is ProductScreenshot => s !== undefined);
        validateSteps(locked, current);
        savedFlows.push(next);
        return next;
      }
    ),
    deleteById: vi.fn(async () => undefined),
    findById: vi.fn(async (id: string) => (id === 'flow-1' ? existingFlow() : null)),
    findManyByProductId: vi.fn(async () => []),
    findFlowIdsByScreenshotId: vi.fn(async () => []),
    findManyVisualPublishedByFilterAndAfterIdAndLimit: vi.fn(async () => []),
    findVisualPublishedById: vi.fn(async () => null),
    countVisualPublishedByFilter: vi.fn(async () => 0),
    findManyVisualPublishedByScreenshotId: vi.fn(async () => []),
  };
  return { flowRepository, screenshots, savedFlows };
};

const stepsABC = [
  { screenshotId: 'screenshot-a', caption: '약관 동의' },
  { screenshotId: 'screenshot-c', caption: '정보 입력' },
  { screenshotId: 'screenshot-b', caption: '완료' },
];

describe('CreateProductFlow', () => {
  it('A/C/B 입력을 배열 순서 그대로 저장한다 (position 0,1,2)', async () => {
    const { flowRepository, screenshots, savedFlows } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a' }));
    screenshots.set(
      'screenshot-c',
      createScreenshot({ id: 'screenshot-c', title: '정보 입력', screenType: 'SIGN_UP' })
    );
    screenshots.set('screenshot-b', createScreenshot({ id: 'screenshot-b', title: '완료', screenType: 'OTHER' }));

    const useCase = new CreateProductFlow(flowRepository as never);
    const flow = await useCase.execute({
      productId: 'product-1',
      title: '  회원가입 플로  ',
      description: '회원가입 전체 흐름',
      platform: 'WEB',
      flowType: 'SIGN_UP',
      steps: stepsABC,
    });

    expect(flow.title).toBe('회원가입 플로');
    expect(savedFlows[0].steps.map(step => step.screenshotId)).toEqual([
      'screenshot-a',
      'screenshot-c',
      'screenshot-b',
    ]);
    expect(savedFlows[0].steps.map(step => step.caption)).toEqual(['약관 동의', '정보 입력', '완료']);
  });

  it('타 제품 소속 화면이 포함되면 DB 저장 없이 거절한다', async () => {
    const { flowRepository, screenshots, savedFlows } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a' }));
    screenshots.set('screenshot-b', createScreenshot({ id: 'screenshot-b', productId: 'product-other' }));

    const useCase = new CreateProductFlow(flowRepository as never);
    await expect(
      useCase.execute({
        productId: 'product-1',
        title: '플로',
        description: '',
        platform: 'WEB',
        flowType: 'SIGN_UP',
        steps: [
          { screenshotId: 'screenshot-a', caption: '' },
          { screenshotId: 'screenshot-b', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });

    expect(savedFlows).toHaveLength(0);
  });

  it('같은 화면 중복, 1단계, 51단계는 정규화 단계에서 거절한다', async () => {
    const { flowRepository, screenshots } = createMockRepositories();
    for (let i = 1; i <= 51; i += 1) {
      screenshots.set(`screenshot-${i}`, createScreenshot({ id: `screenshot-${i}` }));
    }

    const useCase = new CreateProductFlow(flowRepository as never);
    const base = {
      productId: 'product-1',
      title: '플로',
      description: '',
      platform: 'WEB',
      flowType: 'SIGN_UP',
    };

    await expect(
      useCase.execute({
        ...base,
        steps: [
          { screenshotId: 'screenshot-1', caption: '' },
          { screenshotId: 'screenshot-1', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });

    await expect(
      useCase.execute({ ...base, steps: [{ screenshotId: 'screenshot-1', caption: '' }] })
    ).rejects.toMatchObject({
      code: 'product-flow/invalid-args',
    });

    await expect(
      useCase.execute({
        ...base,
        steps: Array.from({ length: 51 }, (_, i) => ({ screenshotId: `screenshot-${i + 1}`, caption: '' })),
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });
  });

  it('다른 플랫폼·미분류 화면은 잠금 검증에서 거절한다', async () => {
    const { flowRepository, screenshots } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a', platform: 'WEB' }));
    screenshots.set('screenshot-ios', createScreenshot({ id: 'screenshot-ios', platform: 'IOS' }));
    screenshots.set('screenshot-null', createScreenshot({ id: 'screenshot-null', platform: null }));

    const useCase = new CreateProductFlow(flowRepository as never);
    const base = {
      productId: 'product-1',
      title: '플로',
      description: '',
      platform: 'WEB',
      flowType: 'SIGN_UP',
    };

    await expect(
      useCase.execute({
        ...base,
        steps: [
          { screenshotId: 'screenshot-a', caption: '' },
          { screenshotId: 'screenshot-ios', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });

    await expect(
      useCase.execute({
        ...base,
        steps: [
          { screenshotId: 'screenshot-a', caption: '' },
          { screenshotId: 'screenshot-null', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });

    expect(flowRepository.insert).toHaveBeenCalledTimes(2);
    expect(flowRepository.insert.mock.calls.every(call => call[0].title === '플로')).toBe(true);
  });

  it('존재하지 않는 화면 ID는 잠금 검증에서 거절한다', async () => {
    const { flowRepository, screenshots } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a' }));

    const useCase = new CreateProductFlow(flowRepository as never);
    await expect(
      useCase.execute({
        productId: 'product-1',
        title: '플로',
        description: '',
        platform: 'WEB',
        flowType: 'SIGN_UP',
        steps: [
          { screenshotId: 'screenshot-a', caption: '' },
          { screenshotId: 'screenshot-missing', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });
  });
});

describe('UpdateProductFlow', () => {
  it('B/A/C 순서로 전체 교체하면 새 구성 전체가 저장된다', async () => {
    const { flowRepository, screenshots, savedFlows } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a' }));
    screenshots.set('screenshot-b', createScreenshot({ id: 'screenshot-b' }));
    screenshots.set('screenshot-c', createScreenshot({ id: 'screenshot-c' }));

    const useCase = new UpdateProductFlow(flowRepository as never);
    const updated = await useCase.execute({
      id: 'flow-1',
      title: '바뀐 제목',
      description: '바뀐 설명',
      platform: 'WEB',
      flowType: 'SIGN_UP',
      steps: [
        { screenshotId: 'screenshot-b', caption: '첫 번째' },
        { screenshotId: 'screenshot-a', caption: '두 번째' },
        { screenshotId: 'screenshot-c', caption: '세 번째' },
      ],
    });

    expect(updated.title).toBe('바뀐 제목');
    expect(updated.steps.map(step => step.screenshotId)).toEqual(['screenshot-b', 'screenshot-a', 'screenshot-c']);
    expect(savedFlows[0].steps.map(step => step.screenshotId)).toEqual([
      'screenshot-b',
      'screenshot-a',
      'screenshot-c',
    ]);
  });

  it('검증 실패 시 저장이 일어나지 않아 기존 구성이 보존된다', async () => {
    const { flowRepository, screenshots, savedFlows } = createMockRepositories();
    screenshots.set('screenshot-a', createScreenshot({ id: 'screenshot-a' }));
    screenshots.set('screenshot-ios', createScreenshot({ id: 'screenshot-ios', platform: 'IOS' }));

    const useCase = new UpdateProductFlow(flowRepository as never);
    await expect(
      useCase.execute({
        id: 'flow-1',
        title: '바뀐 제목',
        description: '',
        platform: 'WEB',
        flowType: 'SIGN_UP',
        steps: [
          { screenshotId: 'screenshot-a', caption: '' },
          { screenshotId: 'screenshot-ios', caption: '' },
        ],
      })
    ).rejects.toMatchObject({ code: 'product-flow/invalid-args' });

    expect(savedFlows).toHaveLength(0);
  });
});

describe('DeleteProductFlow', () => {
  it('플로를 삭제하며 화면 삭제 경로를 호출하지 않는다', async () => {
    const { flowRepository } = createMockRepositories();

    const useCase = new DeleteProductFlow(flowRepository as never);
    await useCase.execute('flow-1');

    expect(flowRepository.deleteById).toHaveBeenCalledWith('flow-1');
  });

  it('미존재 플로는 not-found로 실패한다', async () => {
    const { flowRepository } = createMockRepositories();

    const useCase = new DeleteProductFlow(flowRepository as never);
    await expect(useCase.execute('flow-missing')).rejects.toMatchObject({ code: 'product-flow/not-found' });
  });
});

describe('validateFlowSteps', () => {
  it('같은 제품·같은 플랫폼 화면만 통과시킨다', () => {
    const a = createScreenshot({ id: 'a', productId: 'p1', platform: 'WEB' });
    const b = createScreenshot({ id: 'b', productId: 'p1', platform: 'WEB' });

    expect(() =>
      validateFlowSteps([a, b], [{ screenshotId: 'a' }, { screenshotId: 'b' }], { productId: 'p1', platform: 'WEB' })
    ).not.toThrow();
    expect(() => validateFlowSteps([a], [{ screenshotId: 'a' }], { productId: 'p2', platform: 'WEB' })).toThrow();
    expect(() => validateFlowSteps([a], [{ screenshotId: 'a' }], { productId: 'p1', platform: 'IOS' })).toThrow();
  });
});
