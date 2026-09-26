import { describe, expect, it } from 'vitest';
import { computeSourceHash, normalizeSourceText } from '../utils/sourceHash';

describe('sourceHash', () => {
  it('normalizes CRLF to LF and trims outer whitespace', () => {
    expect(normalizeSourceText('  hello\r\nworld  ')).toBe('hello\nworld');
    expect(normalizeSourceText('hello\r\n\r\nworld')).toBe('hello\n\nworld');
  });

  it('produces identical hash for texts differing only in CRLF or outer spaces', () => {
    const hash1 = computeSourceHash('  Title\r\nDescription  ');
    const hash2 = computeSourceHash('Title\nDescription');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes when internal content changes', () => {
    const hash1 = computeSourceHash('<p>StressWatch</p>');
    const hash2 = computeSourceHash('<p>StressWatch 2</p>');
    expect(hash1).not.toBe(hash2);
  });
});
