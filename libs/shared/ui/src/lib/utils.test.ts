import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class strings and resolves tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4', 'text-sm')).toBe('py-1 px-4 text-sm');
  });

  it('ignores falsy inputs', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'visible')).toBe('base visible');
  });

  it('handles conditional arrays', () => {
    expect(cn(['block', { 'text-red-500': true, 'text-blue-500': false }])).toBe('block text-red-500');
  });
});
