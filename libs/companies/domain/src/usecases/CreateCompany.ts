import { createDomainError } from '@darun/utils-error';
import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import { CompanyError, companyCreateFailed } from '../errors/companyError';
import { getCompanyInfoLengthError } from '../info/CompanyInfo';
import type { CompanyRepository } from '../repositories/CompanyRepository';
import { CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class CreateCompany {
  constructor(
    @Inject(CompanyRepositoryToken)
    private readonly companyRepository: CompanyRepository
  ) {}

  async execute({
    name,
    type,
    startAt,
    address,
  }: {
    name: string;
    address: string;
    type: string;
    startAt?: Date;
  }): Promise<Company> {
    const lengthError =
      getCompanyInfoLengthError('name', name) ??
      getCompanyInfoLengthError('type', type) ??
      getCompanyInfoLengthError('address', address);
    if (lengthError) throw createDomainError(CompanyError.InvalidArgs, lengthError);

    const newCompany = new Company({ name, type, startAt, address });

    const insertedCompany = await this.companyRepository.insert(newCompany);

    if (!insertedCompany) {
      throw companyCreateFailed();
    }

    return insertedCompany;
  }
}
