import { describe, expect, it } from 'vitest';
import { parseStartAtToIso } from '../NewCompanyForm/useNewCompanyForm';

describe('parseStartAtToIso', () => {
  it('returns undefined for empty, null, or undefined input', () => {
    expect(parseStartAtToIso(undefined)).toBeUndefined();
    expect(parseStartAtToIso(null)).toBeUndefined();
    expect(parseStartAtToIso('')).toBeUndefined();
    expect(parseStartAtToIso('   ')).toBeUndefined();
  });

  it('correctly converts HTML date string (YYYY-MM-DD) to ISO string without crashing', () => {
    const iso = parseStartAtToIso('2026-09-15');
    expect(iso).toBeDefined();
    expect(new Date(iso!).getUTCFullYear()).toBe(2026);
  });

  it('correctly converts Date object to ISO string', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    expect(parseStartAtToIso(date)).toBe('2025-01-01T00:00:00.000Z');
  });

  it('returns undefined for invalid date string without throwing', () => {
    expect(parseStartAtToIso('not-a-date')).toBeUndefined();
  });
});
