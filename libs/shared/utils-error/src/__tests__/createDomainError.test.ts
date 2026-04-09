import { describe, expect, it } from 'vitest';
import { createDomainError } from '../createDomainError';

describe('createDomainError', () => {
  it('should create error with code', () => {
    const error = createDomainError('test/error');
    expect(error.message).toBe('test/error');
    expect(error.code).toBe('test/error');
  });

  it('should create error with custom message', () => {
    const error = createDomainError('test/error', 'Custom message');
    expect(error.message).toBe('Custom message');
    expect(error.code).toBe('test/error');
  });
});
