import { describe, expect, it } from 'vitest';
import { parseStartAtToIso } from '../NewCompanyForm/useNewCompanyForm';

describe('parseStartAtToIso', () => {
  it('returns undefined for empty, null, or undefined input', () => {
    expect(parseStartAtToIso(undefined)).toBeUndefined();
    expect(parseStartAtToIso(null)).toBeUndefined();
    expect(parseStartAtToIso('')).toBeUndefined();
    expect(parseStartAtToIso('   ')).toBeUndefined();
  });

  it.each(['2026-01-01', '2024-02-29', '2025-12-31'])(
    'preserves the selected calendar date %s at UTC midnight',
    input => {
      expect(parseStartAtToIso(input)).toBe(`${input}T00:00:00.000Z`);
    }
  );

  it('correctly converts Date object to ISO string', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    expect(parseStartAtToIso(date)).toBe('2025-01-01T00:00:00.000Z');
  });

  it('returns undefined for invalid date string without throwing', () => {
    expect(parseStartAtToIso('not-a-date')).toBeUndefined();
  });
});
