import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatCalendarDate, formatDate } from '../lib/date';

const originalTimeZone = process.env.TZ;
afterEach(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

describe.each(['UTC', 'Asia/Seoul', 'America/Los_Angeles'])('formatCalendarDate in %s', timeZone => {
  beforeEach(() => {
    process.env.TZ = timeZone;
  });
  it.each([
    ['2026-01-01', '2026. 01. 01.', 'Jan 1, 2026'],
    ['2024-02-29T00:00:00.000Z', '2024. 02. 29.', 'Feb 29, 2024'],
    ['2025-12-31T23:30:00.000Z', '2025. 12. 31.', 'Dec 31, 2025'],
  ])('preserves the UTC calendar date of %s in both locales', (input, ko, en) => {
    for (const value of [input, new Date(input), new Date(input).getTime()]) {
      expect(formatCalendarDate(value)).toBe(ko);
      expect(formatCalendarDate(value, '-', 'ko')).toBe(ko);
      expect(formatCalendarDate(value, '-', 'en')).toBe(en);
      expect(formatCalendarDate(value, '-', 'en-US')).toBe(en);
    }
  });

  it.each([undefined, null, '', 'invalid', new Date(NaN), NaN])('uses the fallback for %s', input => {
    expect(formatCalendarDate(input)).toBe('-');
    expect(formatCalendarDate(input, 'unknown', 'en')).toBe('unknown');
  });

  it('supports the Unix epoch and leaves the input Date unchanged', () => {
    expect(formatCalendarDate(0)).toBe('1970. 01. 01.');
    const input = new Date('2026-01-01T00:00:00.000Z');
    formatCalendarDate(input);
    expect(input.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

it('keeps instant formatting in the local time zone', () => {
  const localMidnight = new Date(2026, 0, 1);
  expect(formatDate(localMidnight)).toBe('2026. 01. 01.');
  expect(formatDate(localMidnight, '-', 'en')).toBe('Jan 1, 2026');
});
