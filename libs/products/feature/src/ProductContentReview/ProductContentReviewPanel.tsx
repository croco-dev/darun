'use client';

import { Button, buttonVariants } from '@darun/ui';
import { AdminPanel, AdminSectionBody, AdminSectionHeader } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useState, type FormEvent } from 'react';
import { SavedProductDescription } from '../ProductDescription/ProductDescription';
import { ReviewStatus } from './ReviewStatus';
import { useProductContentReview, type Draft, type Snapshot } from './useProductContentReview';

const reviewTime = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
});

export function ProductContentReviewPanel({ slug }: { slug: string }) {
  return <ProductContentReview key={slug} slug={slug} />;
}

const ProductContentReview = bind(useProductContentReview, ProductContentReviewView, {
  displayName: 'ProductContentReview',
});

function ProductContentReviewView({
  snapshot,
  opening,
  stale,
  notice,
  cursor,
  heading,
  openButton,
  product,
  statusNeedsRefresh,
  loading,
  error,
  historyLoading,
  historyError,
  records,
  busy,
  openReview,
  submit,
  setCursor,
  retryDetail,
  retryHistory,
  cancel,
}: ReturnType<typeof useProductContentReview>) {
  return (
    <AdminPanel>
      <AdminSectionHeader title="소개·기능 검토" />
      <AdminSectionBody>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status">
            {loading || statusNeedsRefresh ? (
              '검토 상태 확인 중…'
            ) : product ? (
              <ReviewStatus status={product.status} due={product.due} />
            ) : (
              '검토 상태를 불러오지 못했습니다.'
            )}
          </p>
          {error && (
            <Button type="button" size="sm" disabled={loading} onClick={retryDetail}>
              검토 상태 다시 조회
            </Button>
          )}
          {!snapshot && (
            <button
              ref={openButton}
              type="button"
              className={buttonVariants({ size: 'sm', variant: 'base', color: 'primary' })}
              disabled={opening}
              onClick={() => void openReview()}
            >
              검토 기록 남기기
            </button>
          )}
        </div>
        {notice && (
          <p role="status" className="mt-2 text-sm">
            {notice}
          </p>
        )}
        {snapshot && (
          <ReviewForm
            heading={heading}
            snapshot={snapshot}
            busy={busy}
            stale={stale}
            refresh={openReview}
            cancel={cancel}
            submit={submit}
          />
        )}
        <section className="mt-5" aria-label="검토 이력">
          <h3 className="font-semibold">검토 이력</h3>
          {historyLoading ? (
            <p role="status">검토 이력 확인 중…</p>
          ) : historyError ? (
            <Button type="button" size="sm" onClick={retryHistory}>
              검토 이력 다시 조회
            </Button>
          ) : records?.records.length ? (
            <ul className="divide-y divide-dark-200">
              {records.records.map(record => (
                <li key={record.id} className="space-y-1 py-3 text-sm [overflow-wrap:anywhere]">
                  <p>
                    <time dateTime={record.reviewedAt}>{reviewTime.format(new Date(record.reviewedAt))}</time> · 검토자{' '}
                    {record.reviewerId}
                  </p>
                  {record.memo && <p className="whitespace-pre-wrap">{record.memo}</p>}
                  {record.referenceUrl && (
                    <a className="underline" href={record.referenceUrl} target="_blank" rel="noreferrer">
                      참고 링크
                    </a>
                  )}
                  {record.nextReviewOn && (
                    <p>
                      다음 확인일 <time dateTime={record.nextReviewOn}>{record.nextReviewOn}</time>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            product && <p className="text-sm text-dark-600">저장된 검토 기록이 없습니다.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {cursor && (
              <Button type="button" size="sm" disabled={historyLoading} onClick={() => setCursor(null)}>
                최신 기록
              </Button>
            )}
            {records?.nextCursor && (
              <Button
                type="button"
                size="sm"
                disabled={historyLoading}
                onClick={() => setCursor(records.nextCursor ?? null)}
              >
                이전 기록
              </Button>
            )}
          </div>
        </section>
      </AdminSectionBody>
    </AdminPanel>
  );
}

function ReviewForm({
  heading,
  snapshot,
  busy,
  stale,
  refresh,
  cancel,
  submit,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  snapshot: Snapshot;
  busy: boolean;
  stale: boolean;
  refresh: () => Promise<void>;
  cancel: () => void;
  submit: (event: FormEvent<HTMLFormElement>, draft: Draft) => Promise<void>;
}) {
  const [memo, setMemo] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [nextReviewOn, setNextReviewOn] = useState('');

  return (
    <div className="mt-4 space-y-4">
      <div className="min-w-0 space-y-2 rounded-lg border border-dark-200 p-4 [overflow-wrap:anywhere]">
        <h3 ref={heading} tabIndex={-1} className="font-semibold">
          검토할 소개와 기능
        </h3>
        <p className="font-medium">{snapshot.name}</p>
        <p className="whitespace-pre-wrap">{snapshot.summary}</p>
        <div className="max-w-full overflow-auto">
          <SavedProductDescription description={snapshot.description} />
        </div>
        <ul className="list-disc pl-5">
          {snapshot.features.map(feature => (
            <li key={feature.id}>
              <strong>{feature.name}</strong>
              {feature.summary && <p>{feature.summary}</p>}
            </li>
          ))}
        </ul>
        {!snapshot.features.length && <p>등록된 기능이 없습니다.</p>}
      </div>
      <form onSubmit={event => void submit(event, { memo, referenceUrl, nextReviewOn })}>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">
            검토 메모
            <textarea
              required
              value={memo}
              maxLength={2000}
              onChange={event => setMemo(event.target.value)}
              className="mt-1 block w-full rounded border border-dark-300 p-2"
              rows={3}
            />
          </label>
          <label className="block text-sm">
            참고 링크 (선택)
            <input
              type="url"
              value={referenceUrl}
              maxLength={2048}
              onChange={event => setReferenceUrl(event.target.value)}
              className="mt-1 block w-full rounded border border-dark-300 p-2"
            />
          </label>
          <label className="block text-sm">
            다음 확인일 (선택, 한국 시간 기준)
            <input
              type="date"
              value={nextReviewOn}
              onChange={event => setNextReviewOn(event.target.value)}
              className="mt-1 block rounded border border-dark-300 p-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {stale ? (
              <Button type="button" onClick={() => void refresh()}>
                최신 내용 불러오기
              </Button>
            ) : (
              <Button type="submit" disabled={busy}>
                {busy ? '처리 중…' : '검토 저장'}
              </Button>
            )}
            <Button type="button" onClick={cancel}>
              취소
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
