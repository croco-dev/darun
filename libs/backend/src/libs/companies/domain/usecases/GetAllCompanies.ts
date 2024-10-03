import { Company, CompanyRepository, CompanyRepositoryToken } from '@companies/domain';
import { Inject, Service } from 'typedi';

@Service()
export class GetAllCompanies {
  constructor(@Inject(CompanyRepositoryToken) private readonly companyRepository: CompanyRepository) {}

  async execute({ page, limit = 50 }: { page: number; limit: number }): Promise<{ data: Company[]; total: number }> {
    return this.companyRepository.findAllWithPagination(page, limit);
  }
}
