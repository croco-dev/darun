import { Token } from "typedi";
import { Category } from "../entities/Category";

export interface CategoryRepository {
  findOneBySlug(slug: string): Promise<Category | null>;
  findOneById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  insert(values: Category): Promise<Category | null>;
  updateById(
    id: string,
    modifier: (category: Category) => Category,
  ): Promise<Category>;
}

export const CategoryRepositoryToken = new Token<CategoryRepository>(
  "CategoryRepository",
);
