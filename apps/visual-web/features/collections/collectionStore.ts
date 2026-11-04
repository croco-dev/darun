'use client';

import { useSyncExternalStore } from 'react';

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

interface StoreSnapshot {
  collections: NamedCollection[];
  storageError: string | null;
}

const STORAGE_KEY = 'darun-visual-collections-v1';
const LOCK_UNAVAILABLE =
  '이 브라우저에서는 컬렉션을 안전하게 변경할 수 없습니다. 최신 브라우저의 HTTPS 페이지에서 다시 시도해 주세요.';
const WRITE_FAILED = '브라우저 저장소에 저장하지 못했습니다. 저장 차단 설정을 확인해 주세요.';

const EMPTY_SNAPSHOT: StoreSnapshot = { collections: [], storageError: null };

let snapshot: StoreSnapshot = EMPTY_SNAPSHOT;
let initialized = false;
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

function readStorage(): StoreSnapshot {
  try {
    if (typeof window === 'undefined') return EMPTY_SNAPSHOT;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { collections: [], storageError: null };
    const parsed: unknown = JSON.parse(raw);
    const list: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : parsed !== null &&
          typeof parsed === 'object' &&
          Object.keys(parsed).every(key => key === 'collections') &&
          'collections' in parsed &&
          Array.isArray(parsed.collections)
        ? parsed.collections
        : null;
    if (list === null) throw new Error('bad shape');
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
    if (typeof window !== 'undefined') {
      try {
        void window.localStorage;
      } catch {
        return {
          collections: [],
          storageError: '브라우저 저장소를 사용할 수 없어 컬렉션을 불러오지 못했습니다. 저장 기능이 동작하지 않습니다.',
        };
      }
    }
    return {
      collections: [],
      storageError:
        '저장된 컬렉션 형식을 읽을 수 없어 변경을 막았습니다. 브라우저 저장소의 원문을 백업하고 복구한 뒤 다시 시도해 주세요.',
    };
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: StoreSnapshot) {
  snapshot = next;
  emit();
}

function collectionLocks() {
  return typeof window === 'undefined' ? undefined : window.navigator.locks;
}

function readSnapshot(): StoreSnapshot {
  const current = readStorage();
  return collectionLocks() || current.storageError ? current : { ...current, storageError: LOCK_UNAVAILABLE };
}

async function withCollectionWrite<T>(failure: T, edit: (current: StoreSnapshot) => T): Promise<T> {
  ensureInit();
  try {
    const locks = collectionLocks();
    if (!locks) {
      setSnapshot(readSnapshot());
      return failure;
    }
    return await locks.request(STORAGE_KEY, () => {
      const current = readStorage();
      if (current.storageError) {
        setSnapshot(current);
        return failure;
      }
      return edit(current);
    });
  } catch {
    setSnapshot({ ...readStorage(), storageError: WRITE_FAILED });
    return failure;
  }
}

// Called only inside the lock, with collections derived from its fresh read.
function persist(collections: NamedCollection[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  setSnapshot({ collections, storageError: null });
}

function ensureInit() {
  if (initialized) return;
  initialized = true;
  snapshot = readSnapshot();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', event => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      snapshot = readSnapshot();
      emit();
    });
  }
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
  return withCollectionWrite<NamedCollection | null>(null, current => {
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
    persist([...current.collections, collection]);
    return collection;
  });
}

export function deleteCollection(id: string) {
  return withCollectionWrite(false, current => {
    persist(current.collections.filter(c => c.id !== id));
    return true;
  });
}

export async function addToCollection(collectionId: string, item: SavedItem): Promise<boolean> {
  if (!isSavedItem(item) || !isSafeItem(item)) return false;
  return withCollectionWrite(false, current => {
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
    persist(current.collections.map(c => (c === collection ? { ...c, items: [...c.items, item] } : c)));
    return true;
  });
}

export function removeFromCollection(collectionId: string, kind: SavedItemKind, id: string) {
  return withCollectionWrite(false, current => {
    persist(
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

export function savedIn(kind: SavedItemKind, id: string): NamedCollection[] {
  ensureInit();
  return snapshot.collections.filter(c => c.items.some(i => i.kind === kind && i.id === id));
}
