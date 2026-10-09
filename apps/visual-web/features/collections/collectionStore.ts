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

const EMPTY_SNAPSHOT: StoreSnapshot = { collections: [], storageError: null };

let snapshot: StoreSnapshot = EMPTY_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();
let storageAvailable: boolean | null = null;

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

function readStorage(): {
  collections: NamedCollection[];
  storageError: string | null;
} {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return { collections: [], storageError: null };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    storageAvailable = true;
    if (raw === null || raw === '') return { collections: [], storageError: null };
    const parsed: unknown = JSON.parse(raw);
    const list: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : parsed !== null && typeof parsed === 'object' && 'collections' in parsed && Array.isArray(parsed.collections)
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
        storageError: '저장된 컬렉션 일부가 손상되어 읽을 수 없는 항목은 제외했습니다.',
      };
    }
    return { collections, storageError: null };
  } catch {
    if (typeof window !== 'undefined') {
      try {
        void window.localStorage;
      } catch {
        storageAvailable = false;
        return {
          collections: [],
          storageError: '브라우저 저장소를 사용할 수 없어 컬렉션을 불러오지 못했습니다. 저장 기능이 동작하지 않습니다.',
        };
      }
    }
    if (storageAvailable !== false) storageAvailable = true;
    return {
      collections: [],
      storageError:
        '저장된 컬렉션 데이터를 읽을 수 없습니다(형식 오류). 기존 데이터를 건드리지 않고 빈 상태로 표시합니다.',
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

function persist(collections: NamedCollection[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    storageAvailable = true;
    setSnapshot({ collections, storageError: null });
    return true;
  } catch {
    storageAvailable = false;
    setSnapshot({
      collections: snapshot.collections,
      storageError: '브라우저 저장소에 저장하지 못했습니다. 저장 차단 설정을 확인해 주세요.',
    });
    return false;
  }
}

function ensureInit() {
  if (initialized) return;
  initialized = true;
  snapshot = readStorage();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', event => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      snapshot = readStorage();
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

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function useCollections(): StoreSnapshot & {
  createCollection: (name: string) => NamedCollection | null;
  deleteCollection: (id: string) => void;
  toggleInCollection: (collectionId: string, item: SavedItem) => void;
  removeFromCollection: (collectionId: string, kind: SavedItemKind, id: string) => void;
  savedIn: (kind: SavedItemKind, id: string) => NamedCollection[];
  isStorageBlocked: () => boolean;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...state,
    createCollection,
    deleteCollection,
    toggleInCollection,
    removeFromCollection,
    savedIn,
    isStorageBlocked,
  };
}

export function createCollection(name: string): NamedCollection | null {
  ensureInit();
  const trimmed = name.trim();
  if (trimmed === '') return null;
  if (storageAvailable === false) {
    setSnapshot({
      ...snapshot,
      storageError: '브라우저 저장소가 차단되어 컬렉션을 만들 수 없습니다.',
    });
    return null;
  }
  const collection: NamedCollection = {
    id: newId(),
    name: trimmed.slice(0, 60),
    createdAt: Date.now(),
    items: [],
  };
  const ok = persist([...snapshot.collections, collection]);
  return ok ? collection : null;
}

export function deleteCollection(id: string) {
  ensureInit();
  persist(snapshot.collections.filter(c => c.id !== id));
}

export function toggleInCollection(collectionId: string, item: SavedItem) {
  ensureInit();
  if (!isSavedItem(item) || !isSafeItem(item)) return;
  persist(
    snapshot.collections.map(c => {
      if (c.id !== collectionId) return c;
      const exists = c.items.some(i => i.kind === item.kind && i.id === item.id);
      return {
        ...c,
        items: exists ? c.items.filter(i => !(i.kind === item.kind && i.id === item.id)) : [...c.items, item],
      };
    })
  );
}

export function removeFromCollection(collectionId: string, kind: SavedItemKind, id: string) {
  ensureInit();
  persist(
    snapshot.collections.map(c =>
      c.id !== collectionId
        ? c
        : {
            ...c,
            items: c.items.filter(i => !(i.kind === kind && i.id === id)),
          }
    )
  );
}

export function savedIn(kind: SavedItemKind, id: string): NamedCollection[] {
  ensureInit();
  return snapshot.collections.filter(c => c.items.some(i => i.kind === kind && i.id === id));
}

export function isStorageBlocked() {
  return storageAvailable === false;
}
