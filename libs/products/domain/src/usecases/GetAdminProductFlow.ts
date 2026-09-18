import { Inject, Service } from 'typedi';
import type { ProductFlowRepository, VisualFlowDetail } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';

type GetAdminProductFlowArgs = {
  id: string;
};

@Service()
export class GetAdminProductFlow {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository
  ) {}

  /**
   * 관리자 편집용 플로 상세. 제품 공개 여부와 무관하게
   * 단계 화면 정보까지 함께 반환한다.
   */
  async execute({ id }: GetAdminProductFlowArgs): Promise<VisualFlowDetail | null> {
    return this.productFlowRepository.findAdminFlowDetailById(id);
  }
}
