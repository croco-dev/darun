import { describe, expect, it } from 'vitest';
import { createDomainError, type DomainError } from '../createDomainError';

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

  it('should expose code as own enumerable property', () => {
    const error = createDomainError('auth/unauthorized');

    expect(Object.prototype.hasOwnProperty.call(error, 'code')).toBe(true);
    expect(error.code).toBe('auth/unauthorized');
  });

  it('should produce an Error instance', () => {
    const error = createDomainError('any/code', 'Any message');

    expect(error).toBeInstanceOf(Error);
    expect((error as DomainError).stack).toBeDefined();
  });

  it('should preserve code even when custom message is empty string', () => {
    const error = createDomainError('validation/failed', '');

    expect(error.message).toBe('');
    expect(error.code).toBe('validation/failed');
  });
});
