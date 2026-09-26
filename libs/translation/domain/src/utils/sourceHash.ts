import crypto from 'node:crypto';

export function normalizeSourceText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function computeSourceHash(text: string): string {
  const normalized = normalizeSourceText(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
