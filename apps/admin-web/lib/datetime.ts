import dayjs from 'dayjs';

// Backend ISO strings may lack an explicit zone; treat zone-less strings as UTC
// so the same instant renders identically regardless of server/browser locale.
// dayjs has no timezone plugin here, so KST (+09:00) is applied by explicit shift.
export function parseAsUtc(value: string | Date): dayjs.Dayjs | null {
  if (value instanceof Date) {
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }
  const trimmed = value.trim();
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const d = dayjs(hasZone ? trimmed : `${trimmed.replace(' ', 'T')}Z`);
  return d.isValid() ? d : null;
}

export function formatAsKst(value: string | Date | null | undefined, format: string): string | null {
  if (!value) return null;
  const d = parseAsUtc(value);
  if (!d) return null;
  return d.add(9, 'hour').format(format);
}
