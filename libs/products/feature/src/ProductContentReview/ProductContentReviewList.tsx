'use client';

import type { AdminProductContentReviewFilter } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionBody } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ReviewStatus } from './ReviewStatus';
import { useProductContentReviewList } from './useProductContentReviewList';

const filters: Record<AdminProductContentReviewFilter, string> = {
  ALL: '전체',
  UNREVIEWED: '검토 기록 없음',
  CHANGED: '검토 후 변경',
  DUE: '확인일 도래',
};

export const ProductContentReviewList = bind(useProductContentReviewList, ProductContentReviewListView, {
  displayName: 'ProductContentReviewList',
});

function ProductContentReviewListView({
  filter,
  page,
  loading,
  error,
  pageNumber,
  selectFilter,
  retry,
  previous,
  next,
}: ReturnType<typeof useProductContentReviewList>) {
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
                onChange={() => selectFilter(value)}
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
              <Button type="button" size="sm" onClick={retry}>
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
          <Button type="button" size="sm" disabled={loading || pageNumber === 1} onClick={previous}>
            이전 페이지
          </Button>
          <span>{pageNumber} 페이지</span>
          <Button type="button" size="sm" disabled={loading || Boolean(error) || !page?.nextCursor} onClick={next}>
            다음 페이지
          </Button>
        </nav>
      </AdminSectionBody>
    </AdminPanel>
  );
}
