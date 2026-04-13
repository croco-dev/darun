import { Inject, Service } from "typedi";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";
import type { CategoryRepository } from "../repositories/CategoryRepository";
import { CategoryRepositoryToken } from "../repositories/CategoryRepository";
import { Product } from "../entities/Product";

@Service()
export class GetProductsByCategory {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute({
    slug,
  }: {
    slug: string;
  }): Promise<{
    category: {
      id: string;
      slug: string;
      labelKo: string;
      labelEn: string;
    } | null;
    products: Product[];
  }> {
    const category = await this.categoryRepository.findOneBySlug(slug);

    if (!category) {
      return { category: null, products: [] };
    }

    const products = await this.productRepository.findPublishedByCategoryId(
      category.id,
    );

    return {
      category: {
        id: category.id,
        slug: category.slug,
        labelKo: category.labelKo,
        labelEn: category.labelEn,
      },
      products,
    };
  }
}
