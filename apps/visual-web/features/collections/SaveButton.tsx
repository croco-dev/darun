'use client';

import { Check, Dialog, Plus } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useId, useState } from 'react';
import { SavedItem, createCollection, toggleInCollection, useCollections } from './collectionStore';

export interface SaveItemInput {
  kind: 'screenshot' | 'flow' | 'app';
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  productName: string;
}

export function SaveButton({ item, className }: { item: SaveItemInput; className?: string }) {
  const { collections, storageError } = useCollections();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const titleId = useId();
  const saved: SavedItem = item;

  const savedCount = collections.filter(c => c.items.some(i => i.kind === saved.kind && i.id === saved.id)).length;
  const isSaved = savedCount > 0;

  const create = () => {
    const created = createCollection(draft);
    if (created) {
      toggleInCollection(created.id, saved);
      setDraft('');
    }
  };

  return (
    <span className={`inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-pressed={isSaved}
        aria-label={isSaved ? `저장됨 (${savedCount}개 컬렉션), 컬렉션 선택 열기` : '컬렉션에 저장'}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2 ${
          isSaved
            ? 'bg-surface-100 text-dark-900 hover:bg-surface-200'
            : 'text-dark-600 hover:bg-surface-100 hover:text-dark-900'
        }`}
      >
        {isSaved ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {isSaved ? `저장됨${savedCount > 1 ? ` · ${savedCount}` : ''}` : '저장'}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={titleId}
        className="w-[min(24rem,calc(100vw-2rem))] max-w-96"
      >
        <div className="w-full rounded-2xl bg-white p-5 sm:p-6">
          <p id={titleId} className="text-lg font-bold tracking-tight text-dark-900">
            컬렉션에 저장
          </p>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-dark-600">
            이 브라우저에만 저장됩니다. 계정과 동기화되지 않습니다.
          </p>
          {storageError ? (
            <p role="alert" className="rounded-lg bg-surface-100 px-2.5 py-2 text-xs text-dark-600">
              {storageError}
            </p>
          ) : null}
          {collections.length === 0 ? (
            <p className="px-1 py-2 text-xs text-dark-600">아직 컬렉션이 없습니다. 아래에서 새로 만드세요.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto py-1">
              {collections.map(c => {
                const checked = c.items.some(i => i.kind === saved.kind && i.id === saved.id);
                return (
                  <li key={c.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-dark-800 hover:bg-surface-50 focus-within:ring-2 focus-within:ring-dark-900/60">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInCollection(c.id, saved)}
                        className="h-4 w-4 accent-dark-900"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-xs text-dark-600 tabular-nums">{c.items.length}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex gap-2 border-t border-dark-100 pt-4">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && draft.trim() !== '') create();
              }}
              placeholder="새 컬렉션 이름"
              maxLength={60}
              aria-label="새 컬렉션 이름"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-dark-150 bg-white px-3 text-sm text-dark-900 placeholder:text-dark-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            />
            <button
              type="button"
              onClick={create}
              disabled={draft.trim() === ''}
              className="min-h-11 shrink-0 rounded-lg bg-dark-900 px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              만들기
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-dark-600 hover:bg-surface-50 hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              닫기 (Esc)
            </button>
            <Link
              href="/collections"
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-dark-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
            >
              전체 보기
            </Link>
          </div>
        </div>
      </Dialog>
    </span>
  );
}
