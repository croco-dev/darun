import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import { companyCreateFailed } from '../errors/companyError';
import { CompanyRepository, CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class CreateCompany {
  constructor(@Inject(CompanyRepositoryToken) private readonly companyRepository: CompanyRepository) {}

  async execute({
    name,
    type,
    startAt,
    address,
  }: {
    name: string;
    address: string;
    type: string;
    startAt: Date;
  }): Promise<Company> {
    const newCompany = new Company({ name, type, startAt, address });

    const insertedCompany = await this.companyRepository.insert(newCompany);

    if (!insertedCompany) {
      throw companyCreateFailed();
    }

    return insertedCompany;
  }
}
