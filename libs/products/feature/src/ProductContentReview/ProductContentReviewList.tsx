'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AdminProductContentReviewInboxDocument, type AdminProductContentReviewFilter } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionBody } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { useState } from 'react';
import { ReviewStatus } from './ReviewStatus';

gql`
  query AdminProductContentReviewInbox($filter: AdminProductContentReviewFilter!, $after: String) {
    adminProductContentReviewPage(filter: $filter, after: $after) {
      items {
        id
        name
        slug
        status
        due
        nextReviewOn
      }
      nextCursor
    }
  }
`;

const filters: Record<AdminProductContentReviewFilter, string> = {
  ALL: '전체',
  UNREVIEWED: '검토 기록 없음',
  CHANGED: '검토 후 변경',
  DUE: '확인일 도래',
};

export function ProductContentReviewList() {
  const [filter, setFilter] = useState<AdminProductContentReviewFilter>('ALL');
  const [cursors, setCursors] = useState<string[]>([]);
  const { data, loading, error, refetch } = useQuery(AdminProductContentReviewInboxDocument, {
    variables: { filter, after: cursors[cursors.length - 1] ?? null },
    fetchPolicy: 'no-cache',
  });
  const page = data?.adminProductContentReviewPage;

  return (
    <AdminPanel>
      <AdminSectionBody>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2 border-b border-dark-200 pb-4">
          <legend className="mb-2 font-semibold">검토 상태 필터</legend>
          {(Object.keys(filters) as AdminProductContentReviewFilter[]).map(value => (
            <label key={value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="review-filter"
                checked={filter === value}
                onChange={() => {
                  setFilter(value);
                  setCursors([]);
                }}
              />
              {filters[value]}
            </label>
          ))}
        </fieldset>
        <div aria-live="polite">
          {loading ? (
            <p className="py-4">검토 대상 확인 중…</p>
          ) : error ? (
            <p className="py-4">
              검토 대상을 불러오지 못했습니다.{' '}
              <Button type="button" size="sm" onClick={() => void refetch().catch(() => {})}>
                다시 조회
              </Button>
            </p>
          ) : page?.items.length ? (
            <ul aria-label="서비스 검토 목록" className="divide-y divide-dark-200">
              {page.items.map(item => (
                <li key={item.id}>
                  <Link
                    href={`/products/${encodeURIComponent(item.slug)}#product-content-review`}
                    className="block py-3 hover:bg-dark-50 [overflow-wrap:anywhere]"
                  >
                    <span className="block font-semibold underline">{item.name}</span>
                    <span className="block text-sm text-dark-600">
                      <ReviewStatus status={item.status} due={item.due} />
                      {item.nextReviewOn && (
                        <>
                          {' '}
                          · 다음 확인일 <time dateTime={item.nextReviewOn}>{item.nextReviewOn}</time>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4">이 조건에 맞는 서비스가 없습니다.</p>
          )}
        </div>
        <nav
          aria-label="서비스 검토 목록 페이지"
          className="flex flex-wrap items-center gap-3 border-t border-dark-200 pt-3"
        >
          <Button
            type="button"
            size="sm"
            disabled={loading || !cursors.length}
            onClick={() => setCursors(current => current.slice(0, -1))}
          >
            이전 페이지
          </Button>
          <span>{cursors.length + 1} 페이지</span>
          <Button
            type="button"
            size="sm"
            disabled={loading || Boolean(error) || !page?.nextCursor}
            onClick={() => {
              if (page?.nextCursor) setCursors([...cursors, page.nextCursor]);
            }}
          >
            다음 페이지
          </Button>
        </nav>
      </AdminSectionBody>
    </AdminPanel>
  );
}
