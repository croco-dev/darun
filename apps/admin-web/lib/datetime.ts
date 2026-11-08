import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Backend ISO strings may lack an explicit zone; treat zone-less strings as UTC
// so the same instant renders identically regardless of server/browser locale.
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
  // Format shifted UTC fields so host DST gaps cannot normalize KST wall time.
  // Offset tokens describe KST; bracketed Day.js literals remain untouched.
  const kstFormat = format.replace(/\[[^\]]*]|ZZ?/g, token =>
    token === 'Z' ? '[+09:00]' : token === 'ZZ' ? '[+0900]' : token
  );
  return d.utc().add(9, 'hour').format(kstFormat);
}
