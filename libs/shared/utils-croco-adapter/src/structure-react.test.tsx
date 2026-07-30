import { describe, expect, it } from 'vitest';
import { bind } from './structure-react';

describe('structure-react adapter', () => {
  it('exports the darun-owned bind contract', () => {
    expect(typeof bind).toBe('function');
  });
});
