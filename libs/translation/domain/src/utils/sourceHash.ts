import crypto from 'node:crypto';

export function normalizeSourceText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function computeSourceHash(text: string, field?: string): string {
  // A versioned document identity never accepts provenance produced by legacy trim().
  if (field === 'description' || field === 'content') {
    return `document:v1:${crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex')}`;
  }
  const normalized = normalizeSourceText(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
