export function formatDate(input?: string | number | Date | null, fallback = '-', locale?: string): string {
  if (input === null || input === undefined || input === '') return fallback;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return fallback;
  if (locale?.startsWith('en')) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}.`;
}

/** Formats a calendar date stored in the UTC date fields of the existing ISO contract. */
export function formatCalendarDate(input?: string | number | Date | null, fallback = '-', locale?: string): string {
  if (input === null || input === undefined || input === '') return fallback;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return fallback;
  if (locale?.startsWith('en')) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}.`;
}
