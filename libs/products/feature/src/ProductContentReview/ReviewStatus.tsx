import type { AdminProductContentReviewStatus } from '@darun/provider-graphql';

const labels: Record<AdminProductContentReviewStatus, string> = {
  UNREVIEWED: '검토 기록 없음',
  CHANGED: '변경 후 재검토 필요',
  CURRENT: '소개·기능 검토됨',
};

export function ReviewStatus({ status, due }: { status: AdminProductContentReviewStatus; due: boolean }) {
  return (
    <span>
      {labels[status]}
      {due && <span className="ml-2 font-semibold">다음 확인일 도래</span>}
    </span>
  );
}
