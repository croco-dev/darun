'use client';

import { useLocale } from 'next-intl';
import { VoteCountBadge } from '../../uis';
import { useProductVoteCount } from './useProductVoteCount';

export function VoteCountRetry({ loading, retry }: { loading: boolean; retry: () => void }) {
  const en = useLocale() === 'en';
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs text-dark-600" role="status">
      <span>{en ? 'Vote count unavailable.' : '추천 수를 불러오지 못했습니다.'}</span>
      <button
        type="button"
        onClick={retry}
        aria-disabled={loading}
        aria-busy={loading}
        className="rounded px-2 py-2 font-semibold underline focus-visible:outline focus-visible:outline-2"
      >
        {loading ? (en ? 'Loading votes…' : '추천 수 불러오는 중…') : en ? 'Retry vote count' : '추천 수 다시 조회'}
      </button>
    </span>
  );
}

export function ProductVoteCount({ slug, count }: { slug: string; count: number | null }) {
  const read = useProductVoteCount(slug, count);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <VoteCountBadge count={read.count ?? null} />
      {read.unavailable && <VoteCountRetry loading={read.loading} retry={read.retry} />}
    </div>
  );
}
