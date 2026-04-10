import { describe, expect, it } from 'vitest';
import { magazineNotFound } from '../errors/magazineError';

describe('magazineNotFound', () => {
  it('should create error with correct code', () => {
    const error = magazineNotFound();
    expect(error.code).toBe('magazine/not-found');
  });
});
