'use client';

import { Link } from '@darun/utils-router';
import { useRef, useState } from 'react';
import {
  NamedCollection,
  SavedItemKind,
  createCollection,
  deleteCollection,
  removeFromCollection,
  useCollections,
} from './collectionStore';

const KIND_LABEL: Record<SavedItemKind, string> = {
  screenshot: '화면',
  flow: '플로우',
  app: '앱',
};

function SavedCard({
  collectionId,
  item,
  onRemoved,
}: {
  collectionId: string;
  onRemoved: (message: string) => void;
  item: {
    kind: SavedItemKind;
    id: string;
    title: string;
    imageUrl: string;
    href: string;
    productName: string;
  };
}) {
  return (
    <li className="min-w-0">
      <Link
        href={item.href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
      >
        <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg bg-surface-50">
          <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-contain" />
        </div>
        <div className="flex min-w-0 flex-col gap-1 pt-3">
          <span className="truncate text-sm font-semibold text-dark-900">{item.title}</span>
          <span className="truncate text-xs text-dark-600">
            {item.productName} · {KIND_LABEL[item.kind]}
          </span>
        </div>
      </Link>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (removeFromCollection(collectionId, item.kind, item.id))
              onRemoved(`${item.title} 항목을 컬렉션에서 제거했습니다.`);
          }}
          aria-label={`${item.title} 항목을 컬렉션에서 제거`}
          className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-dark-600 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
        >
          제거
        </button>
      </div>
    </li>
  );
}

function CollectionSection({
  collection,
  onRemoved,
}: {
  collection: NamedCollection;
  onRemoved: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const remove = () => {
    if (deleteCollection(collection.id)) onRemoved(`${collection.name} 컬렉션을 삭제했습니다.`);
  };
  return (
    <section aria-labelledby={`collection-${collection.id}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dark-100 pt-4">
        <h2 id={`collection-${collection.id}`} className="text-base font-bold tracking-tight text-dark-900">
          {collection.name}{' '}
          <span className="text-sm font-medium text-dark-600 tabular-nums">{collection.items.length}</span>
        </h2>
        {confirming ? (
          <div className="flex min-h-11 flex-wrap items-center gap-1.5">
            <span className="text-xs text-dark-600">
              {collection.items.length > 0 ? `${collection.items.length}개 항목도 함께 삭제됩니다. ` : ''}
              삭제할까요?
            </span>
            <button
              type="button"
              onClick={remove}
              className="min-h-11 rounded-lg bg-dark-900 px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              삭제 확인
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 rounded-lg px-3 text-xs font-semibold text-dark-600 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (collection.items.length === 0) remove();
              else setConfirming(true);
            }}
            className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-dark-600 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            컬렉션 삭제
          </button>
        )}
      </div>
      {collection.items.length === 0 ? (
        <p className="rounded-xl bg-surface-100 px-4 py-8 text-center text-sm text-dark-600">저장한 항목이 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collection.items.map(item => (
            <SavedCard key={`${item.kind}:${item.id}`} collectionId={collection.id} item={item} onRemoved={onRemoved} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Collections() {
  const { collections, storageError } = useCollections();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const onRemoved = (message: string) => {
    inputRef.current?.focus();
    setAnnouncement(message);
  };
  const total = collections.reduce((n, c) => n + c.items.length, 0);

  const create = () => {
    if (draft.trim() === '') return;
    if (createCollection(draft)) setDraft('');
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-dark-900">
            컬렉션 <span className="ml-1 text-sm font-normal text-dark-600 tabular-nums">{total}</span>
          </h1>
          <p className="text-xs text-dark-600">이 브라우저에만 저장 · 기기 간 동기화 안 됨</p>
        </div>
        <form
          onSubmit={event => {
            event.preventDefault();
            create();
          }}
          className="flex w-full gap-2 sm:items-center lg:w-auto"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
                event.preventDefault();
              }
            }}
            placeholder="새 컬렉션 이름"
            maxLength={60}
            aria-label="새 컬렉션 이름"
            className="min-h-11 min-w-0 w-full rounded-lg border border-dark-150 bg-white px-3 text-sm text-dark-900 placeholder:text-dark-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 sm:max-w-64"
          />
          <button
            type="submit"
            aria-label="컬렉션 만들기"
            disabled={draft.trim() === ''}
            className="min-h-11 shrink-0 rounded-lg bg-dark-900 px-4 text-sm font-semibold whitespace-nowrap text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            만들기
          </button>
        </form>
      </div>
      {storageError ? (
        <p role="alert" className="rounded-xl bg-surface-100 px-4 py-3 text-sm text-dark-700">
          {storageError}
        </p>
      ) : null}
      {collections.length === 0 && !storageError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-100 px-6 py-16 text-center">
          <p className="text-base font-semibold text-dark-900">저장한 컬렉션이 없습니다.</p>
          <p className="text-sm text-dark-600">마음에 드는 화면에서 저장을 눌러 모아보세요.</p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-dark-150 bg-white px-4 py-2 text-sm font-semibold text-dark-800 hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            화면 둘러보기
          </Link>
        </div>
      ) : (
        collections.map(c => <CollectionSection key={c.id} collection={c} onRemoved={onRemoved} />)
      )}
    </div>
  );
}
