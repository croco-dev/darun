import { Token } from 'typedi';
import { Company } from '../entities/Company';

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  findAllWithPagination(page: number, limit: number): Promise<{ data: Company[]; total: number }>;
  insert(values: Company): Promise<Company | null>;
}

export const CompanyRepositoryToken = new Token<CompanyRepository>('CompanyRepository');
