'use client';

import { Button, ImageOff, RefreshCw } from '@darun/ui';
import type { ReactNode } from 'react';

export type ExplorerShellState = {
  loading: boolean;
  queryLengthError: boolean;
  networkError: boolean;
  cards: unknown[];
  totalCount: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onLoadMore: () => void;
  retry: () => void;
};

export function ExplorerShell({
  state,
  hero,
  searchForm,
  skeleton,
  grid,
  resourceName,
  unitName,
  resultsControls,
  children,
}: {
  state: ExplorerShellState;
  hero?: ReactNode;
  searchForm: ReactNode;
  skeleton: ReactNode;
  grid: ReactNode;
  resourceName: string;
  unitName: string;
  resultsControls?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      {hero}
      {searchForm}
      {state.queryLengthError ? (
        <div role="alert" className="rounded-xl bg-surface-50 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            검색어는 100자 이하로 입력해 주세요.
          </p>
          <p className="mt-1 text-sm text-dark-600 break-words [word-break:keep-all]">
            입력을 줄인 뒤 다시 검색해 주세요.
          </p>
        </div>
      ) : state.loading ? (
        skeleton
      ) : state.networkError ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-surface-50 px-6 py-16 text-center">
          <ImageOff size={28} className="shrink-0 text-dark-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
            {resourceName}을 불러오지 못했어요.
          </p>
          <Button
            type="button"
            variant="contained"
            color="primary"
            size="sm"
            onClick={() => state.retry()}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">다시 시도</span>
          </Button>
        </div>
      ) : state.cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-50 px-6 py-16 text-center">
          <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">검색 결과가 없습니다.</p>
          <p className="text-sm text-dark-600 break-words [word-break:keep-all]">다른 검색어나 필터로 시도해 보세요.</p>
          {state.hasFilters && (
            <Button
              type="button"
              variant="shadow"
              color="primary"
              size="sm"
              onClick={() => state.onClearFilters()}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <span className="whitespace-nowrap">필터 초기화</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-dark-100 pt-4">
            <p className="text-sm text-dark-600 tabular-nums" aria-live="polite">
              총 {state.totalCount}
              {unitName}
            </p>
            {resultsControls}
          </div>
          {grid}
          {state.hasNextPage && (
            <div className="flex flex-col items-center gap-2">
              {state.loadMoreError && (
                <p role="alert" className="text-sm text-dark-600 break-words [word-break:keep-all]">
                  더 불러오지 못했어요. 아래 버튼으로 다시 시도해 주세요.
                </p>
              )}
              <Button
                type="button"
                variant="shadow"
                color="primary"
                size="md"
                onClick={() => state.onLoadMore()}
                disabled={state.loadingMore}
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="whitespace-nowrap">{state.loadingMore ? '불러오는 중...' : '더 보기'}</span>
              </Button>
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
}
