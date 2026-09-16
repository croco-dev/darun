'use client';

import { Button } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useProductCompanyInfo } from './useProductCompanyInfo';

function formatStartAt(startAt: unknown) {
  if (!startAt) {
    return '-';
  }

  if (typeof startAt !== 'string' && typeof startAt !== 'number' && !(startAt instanceof Date)) {
    return '-';
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

export const ProductCompanyInfo = bind(useProductCompanyInfo, ({ company, loading, error, refetch }) => {
  if (loading) {
    return <AdminLoadingState title="회사 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <AdminErrorState
        error={error}
        title="회사 정보를 불러오지 못했습니다."
        action={
          <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
            다시 시도
          </Button>
        }
      />
    );
  }

  if (!company) {
    return <AdminEmptyState title="회사 정보가 없습니다." description="회사를 연결해 보세요." />;
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-dark-500">기본 정보</p>
        <p className="text-lg font-medium text-dark-900">{company.name}</p>

        <div className="mt-1 flex flex-wrap items-baseline gap-2.5 text-xs">
          <span className="font-bold text-dark-900 shrink-0">유형</span>
          <span className="text-dark-500">{company.type || '-'}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-2.5 text-xs">
          <span className="font-bold text-dark-900 shrink-0">주소</span>
          <span className="text-dark-500 break-words">{company.address || '-'}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-2.5 text-xs">
          <span className="font-bold text-dark-900 shrink-0">설립일</span>
          <span className="text-dark-500">{formatStartAt(company.startAt)}</span>
        </div>
      </div>
    </div>
  );
});
