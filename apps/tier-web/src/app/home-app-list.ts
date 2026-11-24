export function normalizeHomeTier(value: unknown): number {
  return typeof value === 'string' && /^[0-3]$/.test(value) ? Number(value) : 1;
}
