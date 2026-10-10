'use client';

import { Link } from '@darun/utils-router';
import { useState } from 'react';
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
}: {
  collectionId: string;
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
    <li className="overflow-hidden rounded-xl border border-dark-150 bg-white">
      <Link
        href={item.href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-inset"
      >
        <div className="flex min-h-28 w-full items-center justify-center overflow-hidden bg-surface-100">
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="h-auto max-h-64 w-full object-contain object-top"
          />
        </div>
        <div className="flex flex-col gap-0.5 p-3">
          <span className="truncate text-sm font-semibold text-dark-900">{item.title}</span>
          <span className="truncate text-xs text-dark-600">
            {item.productName} · {KIND_LABEL[item.kind]}
          </span>
        </div>
      </Link>
      <div className="flex justify-end border-t border-dark-100 px-2 py-1">
        <button
          type="button"
          onClick={() => removeFromCollection(collectionId, item.kind, item.id)}
          aria-label={`${item.title}을(를) 컬렉션에서 제거`}
          className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-dark-600 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
        >
          제거
        </button>
      </div>
    </li>
  );
}

function CollectionSection({ collection }: { collection: NamedCollection }) {
  const [confirming, setConfirming] = useState(false);
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
              onClick={() => deleteCollection(collection.id)}
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
              if (collection.items.length === 0) deleteCollection(collection.id);
              else setConfirming(true);
            }}
            className="min-h-11 rounded-lg px-2.5 text-xs font-semibold text-dark-600 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            컬렉션 삭제
          </button>
        )}
      </div>
      {collection.items.length === 0 ? (
        <p className="rounded-xl bg-surface-100 px-4 py-8 text-center text-sm text-dark-600">
          비어 있습니다. 화면·플로우·앱 카드의 저장 버튼으로 모아보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.items.map(item => (
            <SavedCard key={`${item.kind}:${item.id}`} collectionId={collection.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function Collections() {
  const { collections, storageError } = useCollections();
  const [draft, setDraft] = useState('');
  const total = collections.reduce((n, c) => n + c.items.length, 0);

  const create = () => {
    if (draft.trim() === '') return;
    if (createCollection(draft)) setDraft('');
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-dark-900">내 컬렉션</h1>
          <p className="text-sm text-dark-600">
            이 브라우저에만 저장됩니다 · 계정 동기화 없음
            {collections.length > 0 ? (
              <span className="tabular-nums">
                {' '}
                · {collections.length}개 컬렉션 · {total}개 저장
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') create();
            }}
            placeholder="새 컬렉션 이름 (예: 온보딩 참고)"
            maxLength={60}
            aria-label="새 컬렉션 이름"
            className="min-h-[44px] min-w-0 w-full rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 placeholder:text-dark-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 sm:max-w-64"
          />
          <button
            type="button"
            onClick={create}
            disabled={draft.trim() === ''}
            className="min-h-[44px] shrink-0 rounded-xl bg-dark-900 px-4 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
          >
            컬렉션 만들기
          </button>
        </div>
      </div>
      {storageError ? (
        <p role="alert" className="rounded-xl bg-surface-100 px-4 py-3 text-sm text-dark-700">
          {storageError}
        </p>
      ) : null}
      {collections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-100 px-6 py-16 text-center">
          <p className="text-base font-bold text-dark-900">아직 저장된 컬렉션이 없습니다</p>
          <p className="max-w-md text-sm leading-relaxed text-dark-600">
            위에서 컬렉션을 만든 뒤, 화면·플로우·앱 카드의 저장 버튼으로 모아보세요. 새로고침해도 이 브라우저에 그대로
            남습니다.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-dark-150 bg-white px-4 py-2 text-sm font-semibold text-dark-800 hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            화면 둘러보기
          </Link>
        </div>
      ) : (
        collections.map(c => <CollectionSection key={c.id} collection={c} />)
      )}
    </div>
  );
}
