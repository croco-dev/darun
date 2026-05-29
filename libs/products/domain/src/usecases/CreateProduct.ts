import { Inject, Service } from "typedi";
import { Product } from "../entities/Product";
import {
  productCreateFailed,
  productSlugAlreadyExists,
} from "../errors/productError";
import type { ProductRepository } from "../repositories/ProductRepository";
import { ProductRepositoryToken } from "../repositories/ProductRepository";

const PG_UNIQUE_VIOLATION = "23505";

function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Service()
export class CreateProduct {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute({
    name,
    slug,
    logoUrl,
    summary,
    description,
  }: {
    name: string;
    slug: string;
    logoUrl: string;
    summary: string;
    description?: string;
  }): Promise<Product> {
    const exists = await this.productRepository.findOneBySlug(slug);
    if (exists) {
      throw productSlugAlreadyExists();
    }

    const newProduct = new Product({
      name,
      slug,
      logoUrl,
      summary,
      description,
    });

    let insertedProduct: Product | null;
    try {
      insertedProduct = await this.productRepository.insert(newProduct);
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw productSlugAlreadyExists();
      }
      throw error;
    }

    if (!insertedProduct) {
      throw productCreateFailed();
    }

    return insertedProduct;
  }
}
