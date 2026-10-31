import { createDomainError } from '@darun/utils-error';
import { CompanyError } from '../errors/companyError';

export function companySearchArgs({ query, first }: { query: string; first?: number | null }): {
  query: string;
  first: number;
} {
  const normalizedQuery = query.trim();
  const limit = first ?? 20;
  if (Array.from(normalizedQuery).length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw createDomainError(CompanyError.InvalidSearchArgs);
  }
  return { query: normalizedQuery, first: limit };
}
