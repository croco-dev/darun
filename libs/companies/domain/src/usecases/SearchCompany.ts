import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import { CompanyRepository, CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class SearchCompany {
  constructor(@Inject(CompanyRepositoryToken) private readonly companyRepository: CompanyRepository) {}

  execute({ query }: { query: string }): Promise<Company[]> {
    return this.companyRepository.findByName(query);
  }
}
