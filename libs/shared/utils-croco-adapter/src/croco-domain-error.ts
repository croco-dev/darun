import { Problem, ProblemCategory } from '@croco/problems-core';

export interface DomainError extends Error {
  code: string;
}

export class CrocoDomainError extends Problem {
  constructor(code: string, message?: string) {
    super(code, ProblemCategory.InternalServerError, message ?? code);
  }
}

export function createDomainError(code: string, message?: string): DomainError {
  return new CrocoDomainError(code, message);
}
