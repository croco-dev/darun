import { Inject, Service } from 'typedi';
import { Category } from '../entities/Category';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';

@Service()
export class GetCategoryBySlug {
  constructor(
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository
  ) {}

  execute(slug: string): Promise<Category | null> {
    return this.categoryRepository.findOneBySlug(slug);
  }
}
