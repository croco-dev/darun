import { Token } from "typedi";
import { ProductScreenshot } from "../entities/ProductScreenshot";

export interface ProductScreenshotRepository {
  findManyByProductIdSortByPriorityDesc(
    productId: string,
  ): Promise<ProductScreenshot[]>;
  findById(id: string): Promise<ProductScreenshot | null>;
  insert(productScreenshot: ProductScreenshot): Promise<ProductScreenshot>;
  deleteById(id: string): Promise<void>;
}

export const ProductScreenshotRepositoryToken =
  new Token<ProductScreenshotRepository>("ProductScreenshotRepository");
