import { Token } from 'typedi';
import { Company } from '../entities/Company';

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
  insert(values: Company): Promise<Company | null>;
}

export const CompanyRepositoryToken = new Token<CompanyRepository>('CompanyRepository');
