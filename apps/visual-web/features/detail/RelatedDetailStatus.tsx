'use client';
import { Button } from '@darun/ui';

export type RelatedDetailState = {
  relatedStatus: 'loading' | 'error' | 'loaded';
  retryRelated: () => void;
};

export function RelatedDetailStatus({ relatedStatus, retryRelated }: RelatedDetailState) {
  if (relatedStatus === 'loaded') return null;
  if (relatedStatus === 'loading') {
    return (
      <p role="status" className="rounded-xl bg-surface-50 p-6 text-sm text-dark-600">
        연관 목록을 불러오는 중이에요.
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-dark-200 bg-surface-50 p-6 text-sm text-dark-600"
    >
      <p>연관 목록을 불러오지 못했어요.</p>
      <Button
        type="button"
        variant="shadow"
        color="secondary"
        size="sm"
        onClick={retryRelated}
        className="min-h-[44px]"
      >
        연관 목록 다시 시도
      </Button>
    </div>
  );
}
