import { Problem } from '@croco/problems-core';
import { describe, expect, it } from 'vitest';
import { createDomainError, CrocoDomainError } from '../croco-domain-error';

describe('croco-domain-error adapter', () => {
  describe('createDomainError', () => {
    it('should create error with code and message falling back to code', () => {
      const error = createDomainError('test/error');

      expect(error.message).toBe('test/error');
      expect(error.code).toBe('test/error');
    });

    it('should create error with custom message', () => {
      const error = createDomainError('test/error', 'Custom message');

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('test/error');
    });

    it('should produce an Error instance', () => {
      const error = createDomainError('any/code', 'Any message');

      expect(error).toBeInstanceOf(Error);
    });

    it('should preserve code when message is empty string', () => {
      const error = createDomainError('validation/failed', '');

      expect(error.message).toBe('');
      expect(error.code).toBe('validation/failed');
    });

    it('should expose code as own enumerable property', () => {
      const error = createDomainError('auth/unauthorized');

      expect(Object.prototype.hasOwnProperty.call(error, 'code')).toBe(true);
      expect(error.code).toBe('auth/unauthorized');
    });

    it('should have stack trace', () => {
      const error = createDomainError('any/code', 'Any message');

      expect((error as Error).stack).toBeDefined();
    });
  });

  describe('CrocoDomainError integration', () => {
    it('should be instanceof Problem from @croco/problems-core', () => {
      const error = createDomainError('domain/error', 'test');

      expect(error).toBeInstanceOf(Problem);
    });

    it('should be instanceof CrocoDomainError', () => {
      const error = createDomainError('domain/error', 'test');

      expect(error).toBeInstanceOf(CrocoDomainError);
    });

    it('should have Problem category defaulting to InternalServerError', () => {
      const error = createDomainError('domain/error');

      expect(error).toBeInstanceOf(CrocoDomainError);
      expect((error as CrocoDomainError).status).toBe(500);
      expect((error as CrocoDomainError).title).toBe('Internal Server Error');
    });

    it('should serialize to RFC 7807 Problem Details shape', () => {
      const error = createDomainError('cart/item-limit', 'Cart item limit exceeded') as CrocoDomainError;

      expect(error.toJSON()).toStrictEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        code: 'cart/item-limit',
        detail: 'Cart item limit exceeded',
      });
    });

    it('should serialize with type and instance when provided via options', () => {
      const error = createDomainError('order/failed') as CrocoDomainError;

      const json = error.toJSON();
      expect(json.type).toBe('about:blank');
      expect(json.code).toBe('order/failed');
    });

    it('should carry the correct error name', () => {
      const error = new CrocoDomainError('custom/code', 'custom msg');

      expect(error.name).toBe('CrocoDomainError');
    });
  });

  describe('compatibility with error assertions', () => {
    it('should work with instanceof checks in catch blocks', () => {
      const error = createDomainError('test/code', 'test message');

      try {
        throw error;
      } catch (caught) {
        expect(caught).toBe(error);
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toBe('test message');
      }
    });

    it('should have code accessible via property access', () => {
      const error = createDomainError('role/not-found', 'Role not found');

      expect(error.code).toBe('role/not-found');
    });

    it('should pass JSON round-trip via toJSON', () => {
      const error = createDomainError('api/timeout', 'Request timed out') as CrocoDomainError;
      const json = error.toJSON();
      const roundtrip = JSON.parse(JSON.stringify(json));

      expect(roundtrip.code).toBe('api/timeout');
      expect(roundtrip.detail).toBe('Request timed out');
      expect(roundtrip.status).toBe(500);
      expect(roundtrip.title).toBe('Internal Server Error');
    });
  });
});
