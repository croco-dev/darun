const DATABASE = 'darun-visual-collections';
const STORE = 'collections';
const RECORD = 'v1';

export function hasCollectionDatabase() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

async function collectionRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = window.indexedDB.open(DATABASE, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function readCollectionRecord(): Promise<{ value: unknown } | undefined> {
  if (!hasCollectionDatabase()) return undefined;
  const record = await collectionRequest('readonly', store => store.openCursor(RECORD));
  return record ? { value: record.value } : undefined;
}

export async function writeCollectionRecord(record: unknown): Promise<void> {
  await collectionRequest('readwrite', store => store.put(record, RECORD));
}
