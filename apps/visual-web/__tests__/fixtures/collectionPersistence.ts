export const RECORD_KEY = 'test:collection-record';

// Keep the store and UI tests deterministic. Browser tests exercise IndexedDB itself.
export function hasCollectionDatabase() {
  return typeof window !== 'undefined';
}

export async function readCollectionRecord() {
  const raw = window.localStorage.getItem(RECORD_KEY);
  return raw === null ? undefined : { value: JSON.parse(raw) };
}

export async function writeCollectionRecord(record: unknown) {
  window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
}
