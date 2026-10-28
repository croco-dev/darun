import { Inject, Service } from 'typedi';
import { Product } from '../entities/Product';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

@Service()
export class GetProductsByCategory {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository
  ) {}

  async execute({ slug, limit, afterId }: { slug: string; limit: number; afterId?: string }): Promise<{
    category: {
      id: string;
      slug: string;
      labelKo: string;
      labelEn: string;
    } | null;
    products: Product[];
    getTotalCount: () => Promise<number>;
  }> {
    const category = await this.categoryRepository.findOneBySlug(slug);

    if (!category) {
      return { category: null, products: [], getTotalCount: async () => 0 };
    }

    const products = await this.productRepository.findPublishedByCategoryId(category.id, limit, afterId);
    let totalCount: Promise<number> | undefined;

    return {
      category: {
        id: category.id,
        slug: category.slug,
        labelKo: category.labelKo,
        labelEn: category.labelEn,
      },
      products,
      getTotalCount: () => (totalCount ??= this.productRepository.countPublishedByCategoryId(category.id)),
    };
  }
}
