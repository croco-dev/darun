'use client';

import { Button, RefreshCw } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useIndexProductButton } from './useIndexProductButton';

export const IndexProductButton = bind(
  useIndexProductButton,
  ({ indexProduct, loading, error, syncStatus, retrySync, retrying }) => (
    <div className="min-w-0 space-y-2">
      <Button
        onClick={() => {
          indexProduct().catch(() => {});
        }}
        disabled={loading}
        aria-busy={loading}
        title={error}
        variant="contained"
        color="secondary"
        size="sm"
        className="gap-2 active:scale-[0.98] motion-reduce:transform-none"
      >
        {loading ? (
          <RefreshCw size={14} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : null}
        <span className="whitespace-nowrap" aria-live="polite">
          {loading ? '동기화 대기 중...' : error ? '검색 동기화 재시도' : '검색 인덱싱'}
        </span>
      </Button>
      {syncStatus && (
        <div className="text-xs text-dark-600 break-all" aria-live="polite">
          <p>저장된 원문 revision: {syncStatus.sourceRevision}</p>
          <p>
            검색: {syncStatus.searchStatus} (intent revision: {syncStatus.searchIntent?.sourceRevision ?? '-'})
          </p>
          <p>
            번역 등록:{' '}
            {syncStatus.translationDispatchStatus === 'registered'
              ? '등록 완료 — 영어 번역 완료 아님'
              : syncStatus.translationDispatchStatus}{' '}
            (intent revision: {syncStatus.translationIntent?.sourceRevision ?? '-'})
          </p>
          <p>
            영어 번역 작업: {syncStatus.translationJobStatus ?? '없음'} / 전달:{' '}
            {syncStatus.translationJobDispatchStatus ?? '-'}
          </p>
          {syncStatus.translationJobId && <p>번역 작업 ID: {syncStatus.translationJobId}</p>}
          {(syncStatus.searchStatus === 'failed' || syncStatus.translationIntent?.status === 'failed') && (
            <Button type="button" size="sm" variant="base" disabled={retrying} onClick={() => void retrySync()}>
              {retrying ? '재예약 중...' : '실패한 동기화 재시도'}
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-cherry-700">
          {error}
        </p>
      )}
    </div>
  )
);
