import { Inject, Service } from "typedi";
import { SearchableProduct } from "../entities/SearchableProduct";
import type { SearchableProductRepository } from "../repositories/SearchableProductRepository";
import { SearchableProductRepositoryToken } from "../repositories/SearchableProductRepository";

@Service()
export class IndexProduct {
  constructor(
    @Inject(SearchableProductRepositoryToken)
    private readonly searchableProductRepository: SearchableProductRepository,
  ) {}

  async execute({
    id,
    name,
    slug,
    summary,
    description,
    tags,
    category,
  }: {
    id: string;
    name: string;
    slug: string;
    summary: string;
    description?: string;
    tags?: string[];
    category?: string;
  }) {
    return this.searchableProductRepository.index(
      id,
      new SearchableProduct({ name, slug, summary, description, tags, category }),
    );
  }
}
