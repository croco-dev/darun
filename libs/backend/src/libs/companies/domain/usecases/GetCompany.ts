import { Inject, Service } from 'typedi';
import { CompanyRepository, CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class GetCompany {
  constructor(@Inject(CompanyRepositoryToken) private readonly companyRepository: CompanyRepository) {}

  async execute({ id }: { id: string }) {
    return this.companyRepository.findById(id);
  }
}
