export interface DomainError extends Error {
  code: string;
}

export function createDomainError(code: string, message?: string): DomainError {
  const error = new Error(message ?? code) as DomainError;
  error.code = code;
  return error;
}
