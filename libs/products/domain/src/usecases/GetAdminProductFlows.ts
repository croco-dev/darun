import { Inject, Service } from 'typedi';
import type { Product } from '../entities/Product';
import type { ProductFlow } from '../entities/ProductFlow';
import { productInvalidArgs } from '../errors/productError';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import { GetProduct } from './GetProduct';

@Service()
export class GetAdminProductFlows {
  constructor(
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository,
    private readonly getProductUseCase: GetProduct
  ) {}

  /**
   * 관리자 목록용: 제품과 그 제품의 플로 본문을 함께 반환한다.
   * 제품이 없으면 null을 반환한다.
   */
  async execute({ productSlug }: { productSlug: string }): Promise<{ product: Product; flows: ProductFlow[] } | null> {
    const product = await this.getProductUseCase.execute({ slug: productSlug });
    if (!product) {
      return null;
    }
    const flows = await this.productFlowRepository.findManyByProductId(product.id);
    return { product, flows };
  }

  async listSummaries({ productSlug, first, afterId }: { productSlug: string; first: number; afterId?: string }) {
    if (!Number.isInteger(first) || first < 1 || first > 48) {
      throw productInvalidArgs('플로는 한 번에 1~48개를 조회할 수 있습니다.');
    }

    const rows = await this.productFlowRepository.findAdminFlowSummaries(productSlug, first + 1, afterId);
    return { flows: rows.slice(0, first), hasNextPage: rows.length > first };
  }
}
