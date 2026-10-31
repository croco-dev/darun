import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import type { CompanyRepository } from '../repositories/CompanyRepository';
import { CompanyRepositoryToken } from '../repositories/CompanyRepository';
import { companySearchArgs } from '../validators/companySearchArgs';

@Service()
export class SearchCompany {
  constructor(
    @Inject(CompanyRepositoryToken)
    private readonly companyRepository: CompanyRepository
  ) {}

  async execute(args: { query: string; first?: number | null }): Promise<Company[]> {
    const { query, first } = companySearchArgs(args);
    if (!query) return [];
    return this.companyRepository.findByName(query, first);
  }
}
