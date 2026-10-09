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
    <li className="overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs">
      <Link
        href={item.href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-inset"
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
          <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover object-top" />
        </div>
        <div className="flex flex-col gap-0.5 p-3">
          <span className="truncate text-sm font-bold text-dark-900">{item.title}</span>
          <span className="truncate text-xs text-dark-500">
            {item.productName} · {KIND_LABEL[item.kind]}
          </span>
        </div>
      </Link>
      <div className="flex justify-end border-t border-dark-100 px-3 py-2">
        <button
          type="button"
          onClick={() => removeFromCollection(collectionId, item.kind, item.id)}
          aria-label={`${item.title}을(를) 컬렉션에서 제거`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dark-500 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`collection-${collection.id}`} className="text-base font-bold text-dark-900">
          {collection.name}{' '}
          <span className="text-xs font-medium text-dark-400 tabular-nums">({collection.items.length})</span>
        </h2>
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dark-500">
              {collection.items.length > 0 ? `${collection.items.length}개 항목도 함께 삭제됩니다. ` : ''}
              삭제할까요?
            </span>
            <button
              type="button"
              onClick={() => deleteCollection(collection.id)}
              className="rounded-lg bg-dark-900 px-2.5 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              삭제 확인
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dark-500 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
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
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dark-500 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            컬렉션 삭제
          </button>
        )}
      </div>
      {collection.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-dark-150 bg-white px-4 py-6 text-center text-sm text-dark-400">
          비어 있습니다. 화면·플로우·앱 카드의 저장 버튼으로 모아보세요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-dark-900">내 컬렉션</h1>
        <p className="text-sm text-dark-500">
          이 브라우저에만 저장됩니다 · 계정 동기화 없음
          {collections.length > 0 ? (
            <span className="tabular-nums">
              {' '}
              · {collections.length}개 컬렉션 · {total}개 저장
            </span>
          ) : null}
        </p>
      </div>
      {storageError ? (
        <p role="alert" className="rounded-2xl border border-dark-150 bg-white px-4 py-3 text-sm text-dark-700">
          {storageError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') create();
          }}
          placeholder="새 컬렉션 이름 (예: 온보딩 참고)"
          maxLength={60}
          aria-label="새 컬렉션 이름"
          className="min-w-0 flex-1 rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-900 placeholder:text-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
        />
        <button
          type="button"
          onClick={create}
          disabled={draft.trim() === ''}
          className="shrink-0 rounded-xl bg-dark-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          컬렉션 만들기
        </button>
      </div>
      {collections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dark-150 bg-white px-6 py-12 text-center">
          <p className="text-base font-bold text-dark-900">아직 저장된 컬렉션이 없습니다</p>
          <p className="max-w-md text-sm text-dark-500">
            위에서 컬렉션을 만든 뒤, 화면·플로우·앱 카드의 저장 버튼으로 모아보세요. 새로고침해도 이 브라우저에 그대로
            남습니다.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-xl border border-dark-150 px-4 py-2 text-sm font-semibold text-dark-800 hover:border-dark-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 sm:min-h-0"
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
