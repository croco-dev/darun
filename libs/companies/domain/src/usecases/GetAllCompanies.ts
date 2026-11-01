import { createDomainError } from '@darun/utils-error';
import { Inject, Service } from 'typedi';
import { Company } from '../entities/Company';
import { CompanyError } from '../errors/companyError';
import type { CompanyRepository } from '../repositories/CompanyRepository';
import { CompanyRepositoryToken } from '../repositories/CompanyRepository';

@Service()
export class GetAllCompanies {
  constructor(
    @Inject(CompanyRepositoryToken)
    private readonly companyRepository: CompanyRepository
  ) {}

  async execute({ page, limit = 50 }: { page: number; limit?: number }): Promise<{ data: Company[]; total: number }> {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      throw createDomainError(CompanyError.InvalidListArgs);
    }
    return this.companyRepository.findAllWithPagination(page, limit);
  }
}
