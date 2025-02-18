import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import { CompanyRepository, CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class GetAllCompanies {
  constructor(@Inject(CompanyRepositoryToken) private readonly companyRepository: CompanyRepository) {}

  async execute({ page, limit = 50 }: { page: number; limit: number }): Promise<{ data: Company[]; total: number }> {
    return this.companyRepository.findAllWithPagination(page, limit);
  }
}
