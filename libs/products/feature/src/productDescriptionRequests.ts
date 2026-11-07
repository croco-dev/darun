'use client';

// Keep uncertain requests in this tab across reloads, independently for every target.
type DescriptionRequest = { generationSlug: string } | { retryJobId: string };

function storageKey(target: DescriptionRequest): string {
  return 'generationSlug' in target
    ? `darun:description-request:v1:generate:${encodeURIComponent(target.generationSlug)}`
    : `darun:description-request:v1:retry:${encodeURIComponent(target.retryJobId)}`;
}

export function getProductDescriptionRequestId(target: DescriptionRequest): string {
  const key = storageKey(target);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const requestId = crypto.randomUUID();
  // If persistence is unavailable, fail before sending an unrecoverable mutation.
  sessionStorage.setItem(key, requestId);
  return requestId;
}

export function acknowledgeProductDescriptionRequest(target: DescriptionRequest, requestId: string): void {
  const key = storageKey(target);
  if (sessionStorage.getItem(key) === requestId) sessionStorage.removeItem(key);
}
