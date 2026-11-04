'use client';

import { useSyncExternalStore } from 'react';
import { hasCollectionDatabase, readCollectionRecord, writeCollectionRecord } from './collectionPersistence';

export type SavedItemKind = 'screenshot' | 'flow' | 'app';

export interface SavedItem {
  kind: SavedItemKind;
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  productName: string;
}

export interface NamedCollection {
  id: string;
  name: string;
  createdAt: number;
  items: SavedItem[];
}

interface CollectionData {
  collections: NamedCollection[];
  storageError: string | null;
}

interface StoredCollections {
  version: 1;
  collections: NamedCollection[];
  legacyKeys: string[];
}

interface StorageRead extends CollectionData {
  legacyKeys: string[];
  needsImport: boolean;
}

interface StoreSnapshot extends CollectionData {
  loading: boolean;
}

const STORAGE_KEY = 'darun-visual-collections-v1';
const LOCK_UNAVAILABLE =
  '이 브라우저에서는 컬렉션을 안전하게 변경할 수 없습니다. 최신 브라우저의 HTTPS 페이지에서 다시 시도해 주세요.';
const WRITE_FAILED = '브라우저 저장소에 저장하지 못했습니다. 저장 차단 설정을 확인해 주세요.';

const EMPTY_SNAPSHOT: StoreSnapshot = { collections: [], storageError: null, loading: true };

let snapshot: StoreSnapshot = EMPTY_SNAPSHOT;
let initialized = false;
let snapshotRevision = 0;
let changes: BroadcastChannel | undefined;
const listeners = new Set<() => void>();

function isSavedItem(value: unknown): value is SavedItem {
  if (typeof value !== 'object' || value === null) return false;
  if (!(
    'kind' in value &&
    'id' in value &&
    'title' in value &&
    'imageUrl' in value &&
    'href' in value &&
    'productName' in value
  )) {
    return false;
  }
  const kind = value.kind;
  const id = value.id;
  const title = value.title;
  const imageUrl = value.imageUrl;
  const href = value.href;
  const productName = value.productName;
  return (
    (kind === 'screenshot' || kind === 'flow' || kind === 'app') &&
    typeof id === 'string' &&
    typeof title === 'string' &&
    typeof imageUrl === 'string' &&
    typeof href === 'string' &&
    typeof productName === 'string'
  );
}

function isNamedCollection(value: unknown): value is NamedCollection {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value && 'name' in value && 'createdAt' in value && 'items' in value)) return false;
  const id = value.id;
  const name = value.name;
  const createdAt = value.createdAt;
  const items = value.items;
  return (
    typeof id === 'string' &&
    typeof name === 'string' &&
    typeof createdAt === 'number' &&
    Array.isArray(items) &&
    items.every(isSavedItem)
  );
}

const HREF_PREFIX: Record<SavedItemKind, string> = {
  screenshot: '/screenshots/',
  flow: '/flows/',
  app: '/apps/',
};

function isSafeItem(item: SavedItem): boolean {
  const hrefOk = item.href.startsWith(HREF_PREFIX[item.kind]);
  const imageOk =
    (item.imageUrl.startsWith('/') && !item.imageUrl.startsWith('//')) ||
    item.imageUrl.startsWith('https://') ||
    item.imageUrl.startsWith('http://');
  return hrefOk && imageOk;
}

function decodeCollectionList(raw: unknown): unknown[] {
  if (typeof raw !== 'string') throw new Error('bad shape');
  const parsed: unknown = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    Object.keys(parsed).every(key => key === 'collections') &&
    'collections' in parsed &&
    Array.isArray(parsed.collections)
  ) {
    return parsed.collections;
  }
  throw new Error('bad shape');
}

function decodeCollections(list: unknown[]): CollectionData {
  try {
    const seenIds = new Set<string>();
    const collections: NamedCollection[] = [];
    let dropped = false;
    for (const entry of list) {
      if (!isNamedCollection(entry) || seenIds.has(entry.id)) {
        dropped = true;
        continue;
      }
      seenIds.add(entry.id);
      const seenItems = new Set<string>();
      const items: SavedItem[] = [];
      for (const item of entry.items) {
        const key = `${item.kind}:${item.id}`;
        if (seenItems.has(key) || !isSafeItem(item)) {
          dropped = true;
          continue;
        }
        seenItems.add(key);
        items.push(item);
      }
      collections.push({ ...entry, items });
    }
    if (dropped) {
      return {
        collections,
        storageError:
          '저장된 컬렉션 일부를 읽을 수 없습니다. 원문 보호를 위해 변경을 막았습니다. 브라우저 저장소의 원문을 백업하고 복구한 뒤 다시 시도해 주세요.',
      };
    }
    return { collections, storageError: null };
  } catch {
    return { collections: [], storageError: INVALID_STORAGE };
  }
}

const INVALID_STORAGE =
  '저장된 컬렉션 형식을 읽을 수 없어 변경을 막았습니다. 브라우저 저장소의 원문을 백업하고 복구한 뒤 다시 시도해 주세요.';

function readLegacy(raw: string | null): CollectionData {
  try {
    return raw === null ? { collections: [], storageError: null } : decodeCollections(decodeCollectionList(raw));
  } catch {
    return { collections: [], storageError: INVALID_STORAGE };
  }
}

function legacyBackup(): CollectionData {
  try {
    return readLegacy(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { collections: [], storageError: '브라우저 저장소에서 기존 컬렉션을 불러오지 못했습니다.' };
  }
}

function importLegacy(current: StorageRead, legacy: CollectionData): StorageRead {
  if (legacy.storageError) return current;
  const known = new Set(current.legacyKeys);
  const collections = new Map(current.collections.map(collection => [collection.id, collection]));
  // The old writer only publishes whole snapshots. Missing entries can be stale, so
  // only import new keys and remember them even after the new writer deletes them.
  for (const collection of legacy.collections) {
    const collectionKey = JSON.stringify([collection.id]);
    const additions = collection.items.filter(item => !known.has(JSON.stringify([collection.id, item.kind, item.id])));
    const existing = collections.get(collection.id);
    if (additions.length > 0 || !known.has(collectionKey)) {
      known.add(collectionKey);
      for (const item of additions) known.add(JSON.stringify([collection.id, item.kind, item.id]));
      const items = existing?.items ?? [];
      const newItems = additions.filter(item => !items.some(saved => saved.kind === item.kind && saved.id === item.id));
      collections.set(collection.id, { ...(existing ?? collection), items: [...items, ...newItems] });
    }
  }
  return {
    ...current,
    collections: [...collections.values()],
    legacyKeys: [...known],
    needsImport: current.needsImport || known.size !== current.legacyKeys.length,
  };
}

function decodeRecord(raw: unknown): StorageRead {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('version' in raw && raw.version === 1) ||
    !('collections' in raw && Array.isArray(raw.collections)) ||
    !('legacyKeys' in raw && Array.isArray(raw.legacyKeys) && raw.legacyKeys.every(key => typeof key === 'string'))
  ) {
    return { collections: [], storageError: INVALID_STORAGE, legacyKeys: [], needsImport: false };
  }
  return { ...decodeCollections(raw.collections), legacyKeys: raw.legacyKeys, needsImport: false };
}

async function readStorage(legacyEvent?: string): Promise<StorageRead> {
  const initial = { collections: [], storageError: null, legacyKeys: [], needsImport: false };
  if (typeof window === 'undefined') return initial;
  try {
    const stored = await readCollectionRecord();
    const legacy = legacyBackup();
    if (!stored) {
      if (legacy.storageError) return { ...initial, ...legacy };
      const seeded = importLegacy(initial, legacy);
      // The existing v1 data can be read without making a migration write.
      seeded.needsImport = false;
      return legacyEvent === undefined ? seeded : importLegacy(seeded, readLegacy(legacyEvent));
    }
    const current = decodeRecord(stored.value);
    if (current.storageError) return current;
    const latest = importLegacy(current, legacy);
    return legacyEvent === undefined ? latest : importLegacy(latest, readLegacy(legacyEvent));
  } catch {
    return {
      ...initial,
      collections: legacyBackup().collections,
      storageError: '브라우저 저장소를 확인하지 못했습니다. 남아 있는 이전 컬렉션만 읽을 수 있습니다.',
    };
  }
}

function setSnapshot(current: CollectionData) {
  snapshotRevision += 1;
  snapshot = { collections: current.collections, storageError: current.storageError, loading: false };
  for (const listener of listeners) listener();
}

function collectionLocks() {
  return hasCollectionDatabase() ? window.navigator.locks : undefined;
}

async function refreshSnapshot(legacyEvent?: string) {
  const revision = ++snapshotRevision;
  let current = await readStorage(legacyEvent);
  const locks = collectionLocks();
  if (locks && current.needsImport) {
    try {
      current = await locks.request(STORAGE_KEY, () => reconcileStorage(legacyEvent));
    } catch {
      current = { ...current, storageError: LOCK_UNAVAILABLE };
    }
  }
  if (snapshotRevision !== revision) return;
  setSnapshot(locks || current.storageError ? current : { ...current, storageError: LOCK_UNAVAILABLE });
}

async function withCollectionWrite<T>(failure: T, edit: (current: StorageRead) => T | Promise<T>): Promise<T> {
  ensureInit();
  try {
    const locks = collectionLocks();
    if (!locks) {
      await refreshSnapshot();
      return failure;
    }
    return await locks.request(STORAGE_KEY, async () => {
      const current = await reconcileStorage();
      if (current.storageError) {
        setSnapshot(current);
        return failure;
      }
      try {
        return await edit(current);
      } catch {
        setSnapshot({ ...current, storageError: WRITE_FAILED });
        return failure;
      }
    });
  } catch {
    const current = await readStorage();
    setSnapshot({ ...current, storageError: current.storageError ?? LOCK_UNAVAILABLE });
    return failure;
  }
}

// Called inside the lock. Keep the imported keys and collections in one transaction.
async function commitCollections(collections: NamedCollection[], legacyKeys: string[]) {
  const record: StoredCollections = { version: 1, collections, legacyKeys };
  await writeCollectionRecord(record);
  try {
    changes?.postMessage(null);
  } catch {
    // The commit is durable even if a tab cannot notify other readers.
  }
}

async function reconcileStorage(legacyEvent?: string): Promise<StorageRead> {
  const current = await readStorage(legacyEvent);
  if (current.needsImport) {
    try {
      await commitCollections(current.collections, current.legacyKeys);
    } catch {
      return { ...current, storageError: WRITE_FAILED };
    }
  }
  return current;
}

async function persist(current: StorageRead, collections: NamedCollection[]) {
  await commitCollections(collections, current.legacyKeys);
  setSnapshot({ collections, storageError: null });
}

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  void refreshSnapshot();
  if (typeof window.BroadcastChannel === 'function') {
    try {
      changes = new window.BroadcastChannel(STORAGE_KEY);
      changes.addEventListener('message', () => void refreshSnapshot());
    } catch {
      // Returning to the tab refreshes the list even without notifications.
    }
  }
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === STORAGE_KEY) void refreshSnapshot(event.newValue ?? undefined);
  });
  window.addEventListener('focus', () => void refreshSnapshot());
  window.addEventListener('pageshow', () => void refreshSnapshot());
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): StoreSnapshot {
  ensureInit();
  return snapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return EMPTY_SNAPSHOT;
}

function newId(): string | null {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      let hex = '';
      for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
      return `c-${hex}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function useCollections(): StoreSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export async function createCollection(name: string): Promise<NamedCollection | null> {
  const trimmed = name.trim();
  if (trimmed === '') return null;
  return withCollectionWrite<NamedCollection | null>(null, async current => {
    const id = newId();
    if (id === null) {
      setSnapshot({
        ...current,
        storageError: '안전한 식별자를 만들 수 없어 컬렉션을 만들 수 없습니다.',
      });
      return null;
    }
    const collection: NamedCollection = {
      id,
      name: trimmed.slice(0, 60),
      createdAt: Date.now(),
      items: [],
    };
    await persist(current, [...current.collections, collection]);
    return collection;
  });
}

export function deleteCollection(id: string, { onlyIfEmpty = false } = {}) {
  return withCollectionWrite<'deleted' | 'confirmation-required' | 'failed'>('failed', async current => {
    if (onlyIfEmpty && current.collections.some(c => c.id === id && c.items.length > 0)) {
      setSnapshot(current);
      return 'confirmation-required';
    }
    await persist(
      current,
      current.collections.filter(c => c.id !== id)
    );
    return 'deleted';
  });
}

export async function addToCollection(collectionId: string, item: SavedItem): Promise<boolean> {
  if (!isSavedItem(item) || !isSafeItem(item)) return false;
  return withCollectionWrite(false, async current => {
    const collection = current.collections.find(c => c.id === collectionId);
    if (!collection) {
      setSnapshot({
        ...current,
        storageError: '컬렉션이 삭제되어 항목을 저장하지 못했습니다.',
      });
      return false;
    }
    if (collection.items.some(i => i.kind === item.kind && i.id === item.id)) {
      setSnapshot(current);
      return true;
    }
    await persist(
      current,
      current.collections.map(c => (c === collection ? { ...c, items: [...c.items, item] } : c))
    );
    return true;
  });
}

export function removeFromCollection(collectionId: string, kind: SavedItemKind, id: string) {
  return withCollectionWrite(false, async current => {
    await persist(
      current,
      current.collections.map(c =>
        c.id !== collectionId
          ? c
          : {
              ...c,
              items: c.items.filter(i => !(i.kind === kind && i.id === id)),
            }
      )
    );
    return true;
  });
}

export async function savedIn(kind: SavedItemKind, id: string): Promise<NamedCollection[]> {
  const { collections } = await readStorage();
  return collections.filter(c => c.items.some(i => i.kind === kind && i.id === id));
}
