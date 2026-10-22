import { describe, expect, it } from 'vitest';
import { stepSearch } from '../features/flows/stepSearch';

describe('flow step URLs', () => {
  it('keeps other query parameters while changing a step', () => {
    const params = new URLSearchParams(stepSearch('?product=my-app&step=2&q=hello', 3));
    expect(params.get('step')).toBe('3');
    expect(params.get('product')).toBe('my-app');
    expect(params.get('q')).toBe('hello');
  });

  it('returns the canonical first-step URL without dropping other parameters', () => {
    expect(stepSearch('?step=3&product=my-app', 1)).toBe('?product=my-app');
    expect(stepSearch('?step=3', 1)).toBe('');
  });

  it('replaces duplicate or invalid step parameters for copied links', () => {
    expect(stepSearch('?step=bad&step=99', 2)).toBe('?step=2');
    expect(stepSearch('?step=99', 1)).toBe('');
  });
});
