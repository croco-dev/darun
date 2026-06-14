import { describe, expect, it } from 'vitest';
import { bind } from './structure-react';

describe('structure-react adapter', () => {
  it('exports darun-owned bind contract wrapping @croco/utils-structure-react', () => {
    expect(typeof bind).toBe('function');
  });
});
