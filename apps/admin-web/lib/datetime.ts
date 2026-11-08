import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  // Day.js can infer the host's DST offset during tz conversion; keep Seoul's
  // wall-clock fields while explicitly fixing its year-round +09:00 offset.
  return d
    .tz('Asia/Seoul')
    .utcOffset(9 * 60, true)
    .format(format);
}
