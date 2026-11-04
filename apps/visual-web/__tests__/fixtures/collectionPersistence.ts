const KEY = 'darun-visual-collections-v1';

// Keep the store and UI tests deterministic. Browser tests exercise IndexedDB itself.
export function hasCollectionDatabase() {
  return typeof window !== 'undefined';
}

export async function readCollectionRecord() {
  return window.localStorage.getItem(KEY) ?? undefined;
}

export async function writeCollectionRecord(raw: string) {
  window.localStorage.setItem(KEY, raw);
}
