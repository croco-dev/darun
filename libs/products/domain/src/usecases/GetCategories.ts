import { Inject, Service } from 'typedi';
import { Category } from '../entities/Category';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';

@Service()
export class GetCategories {
  constructor(
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository
  ) {}

  async execute({ first }: { first: number }): Promise<Category[]> {
    const categories = await this.categoryRepository.findAll();
    return categories.slice(0, Math.max(0, first));
  }
}
