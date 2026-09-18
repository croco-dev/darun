import { Inject, Service } from 'typedi';
import { ProductFlow } from '../entities/ProductFlow';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { buildFlowDraft, validateFlowSteps, type ProductFlowStepInput } from './CreateProductFlow';

@Service()
export class UpdateProductFlow {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  async execute({
    id,
    title,
    description,
    platform,
    flowType,
    steps,
  }: {
    id: string;
    title: string;
    description: string;
    platform: string;
    flowType: string;
    steps: ProductFlowStepInput[];
  }): Promise<ProductFlow> {
    const draft = buildFlowDraft({ title, description, platform, flowType, steps });

    return this.productFlowRepository.updateById(
      id,
      flow =>
        new ProductFlow({
          id: flow.id,
          // 플로의 productId는 생성 후 변경할 수 없다.
          productId: flow.productId,
          title: draft.title,
          description: draft.description,
          platform: draft.platform,
          flowType: draft.flowType,
          steps: draft.steps,
        }),
      // 잠금 규약(접근 2): flow row와 단계 screenshot rows를 잠근 뒤
      // 기존 플로의 productId 기준으로 단계 무결성을 검증한다.
      (lockedScreenshots, lockedFlow) =>
        validateFlowSteps(lockedScreenshots, draft.steps, {
          productId: lockedFlow.productId,
          platform: draft.platform,
        })
    );
  }
}
