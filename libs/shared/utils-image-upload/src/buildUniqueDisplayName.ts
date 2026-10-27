const MAX_PUBLIC_ID_CHARS = 120;

function sanitizeSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '-')
    .replace(/--+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return normalized.slice(0, 64) || 'image';
}

function randomSuffix(): string {
  const token = crypto.randomUUID();
  return (
    token
      .replace(/[^a-z0-9]+/gi, '')
      .toLowerCase()
      .slice(0, 12) || 'upload'
  );
}

export function buildUniqueDisplayName(seed: string, suffix = randomSuffix()): string {
  const cleanedSuffix = suffix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12);
  const base = sanitizeSegment(seed);
  const candidate = cleanedSuffix ? `${base}-${cleanedSuffix}` : base;
  return candidate.slice(0, MAX_PUBLIC_ID_CHARS);
}
