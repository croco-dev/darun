export function formatDate(input?: string | number | Date | null, fallback = '-'): string {
  if (input === null || input === undefined || input === '') return fallback;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return fallback;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}.`;
}
