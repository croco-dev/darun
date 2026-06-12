'use client';

import { bind } from '@croco/utils-structure-react';
import { AdminEmptyState } from '@darun/ui-admin';
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

export const ProductCompanyInfo = bind(useProductCompanyInfo, ({ company }) => {
  if (!company) {
    return <AdminEmptyState title="회사 정보가 없습니다." description="회사를 연결해 보세요." />;
  }

  return (
    <div>
      <div className="flex flex-nowrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-dark-500">기본 정보</p>

          <p className="text-lg font-medium text-dark-900">{company.name}</p>

          <div className="mt-1 flex flex-nowrap items-center gap-2.5 text-xs">
            <span className="font-bold text-dark-900">유형</span>
            <span className="text-dark-500">{company.type}</span>
          </div>

          <div className="mt-1 flex flex-nowrap items-center gap-2.5 text-xs">
            <span className="font-bold text-dark-900">주소</span>
            <span className="text-dark-500">{company.address}</span>
          </div>

          <div className="mt-1 flex flex-nowrap items-center gap-2.5 text-xs">
            <span className="font-bold text-dark-900">상장일</span>
            <span className="text-dark-500">{formatStartAt(company.startAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
