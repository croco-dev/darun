'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductResearchJobsDocument } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState, AdminPanel } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { useState } from 'react';
import { formatAsKst } from '../../lib/datetime';

gql`
  query AdminProductResearchJobs($after: String) {
    adminProductResearchJobs(after: $after) {
      jobs {
        id
        officialUrl
        status
        createdAt
      }
      nextCursor
    }
  }
`;

const statusLabels = new Map([
  ['pending', '대기 중'],
  ['in_progress', '진행 중'],
  ['completed', '완료'],
  ['failed', '실패'],
]);

export function ProductResearchHistory() {
  const [cursors, setCursors] = useState<string[]>([]);
  const { data, error, loading, refetch } = useQuery(AdminProductResearchJobsDocument, {
    variables: { after: cursors.at(-1) ?? null },
    fetchPolicy: 'network-only',
  });
  const page = data?.adminProductResearchJobs;
  const nextCursor = page?.nextCursor;

  return (
    <AdminPanel className="overflow-hidden">
      {error ? (
        <AdminErrorState
          title="조사 이력을 불러오지 못했습니다."
          action={
            <Button type="button" size="sm" onClick={() => void refetch().catch(() => {})}>
              다시 조회
            </Button>
          }
        />
      ) : loading ? (
        <AdminLoadingState title="조사 이력을 불러오는 중..." />
      ) : page?.jobs.length ? (
        <ul className="divide-y divide-dark-200" aria-label="조사 작업">
          {page.jobs.map(job => (
            <li key={job.id}>
              <Link
                href={`/products/new?researchJobId=${encodeURIComponent(job.id)}`}
                className="block px-5 py-3 hover:bg-dark-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-900"
              >
                <span className="block text-sm font-semibold text-dark-900 [overflow-wrap:anywhere]">
                  {job.officialUrl}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-dark-600">
                  <span>{statusLabels.get(job.status) ?? '상태 확인 필요'}</span>
                  <time dateTime={job.createdAt}>{formatAsKst(job.createdAt, 'YYYY-MM-DD HH:mm [KST]')}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <AdminEmptyState title="저장된 조사 작업이 없습니다." />
      )}

      <nav
        aria-label="조사 이력 페이지"
        className="flex flex-wrap items-center justify-center gap-3 border-t border-dark-200 p-3"
      >
        <Button
          type="button"
          size="sm"
          variant="contained"
          color="secondary"
          aria-disabled={loading || cursors.length === 0}
          className="aria-disabled:opacity-50"
          onClick={() => {
            if (!loading && cursors.length > 0) setCursors(cursors.slice(0, -1));
          }}
        >
          이전 페이지
        </Button>
        <span className="text-sm text-dark-600" aria-live="polite">
          {cursors.length + 1} 페이지
        </span>
        <Button
          type="button"
          size="sm"
          aria-disabled={loading || Boolean(error) || !nextCursor}
          className="aria-disabled:opacity-50"
          onClick={() => {
            if (!loading && !error && nextCursor) setCursors([...cursors, nextCursor]);
          }}
        >
          다음 페이지
        </Button>
      </nav>
    </AdminPanel>
  );
}
