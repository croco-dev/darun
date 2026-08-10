'use client';

import { Button } from '@darun/ui';
import { AdminPanel, AdminEmptyState, AdminErrorState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';
import { useAllCompanyListTable } from './useAllCompanyListTable';

type CompanyRecord = {
  id: string;
  name: string;
  type: string;
  address: string;
  startAt?: string | Date | null;
};

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

export const AllCompanyListTable = bind(
  useAllCompanyListTable,
  ({ companies, totalCount, page, handlePage, loading, error }) => {
    if (loading) {
      return <AdminLoadingState />;
    }

    if (error) {
      return <AdminErrorState description={error.message} />;
    }

    if (!companies || companies.length === 0) {
      return (
        <AdminPanel className="p-8">
          <AdminEmptyState title="등록된 기업이 없습니다." description="새로운 기업을 등록해 보세요." />
        </AdminPanel>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <AdminPanel className="overflow-hidden">
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-surface-100">
              <tr>
                {dataTableColumns.map(col => (
                  <th
                    key={col.accessor}
                    className="border-b border-r border-dark-200 px-4 py-3 text-left text-sm font-medium text-dark-900 last:border-r-0"
                    style={{ width: col.accessor === 'id' ? 100 : col.accessor === 'startAt' ? 150 : undefined }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(companies ?? []).map((record, index) => (
                <tr
                  key={record.id}
                  className={`border-b border-dark-200 transition hover:bg-surface-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-surface-100/30'
                  }`}
                >
                  {dataTableColumns.map(col => (
                    <td
                      key={col.accessor}
                      className="border-r border-dark-200 px-4 py-3 text-sm text-dark-900 last:border-r-0 truncate"
                      title={col.render ? undefined : String(record[col.accessor as keyof CompanyRecord] ?? '-')}
                    >
                      {col.render ? col.render(record) : String(record[col.accessor as keyof CompanyRecord] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
        {totalCount && totalCount > 50 ? (
          <AdminPanel className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-dark-900">
                총 {totalCount}개 중 {(page - 1) * 50 + 1}-{Math.min(page * 50, totalCount)}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="base"
                  size="sm"
                  onClick={() => handlePage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </span>
                </Button>
                <span className="px-3 py-1 text-sm text-dark-900 font-medium">{page}</span>
                <Button
                  type="button"
                  variant="base"
                  size="sm"
                  onClick={() => handlePage(Math.min(Math.ceil(totalCount / 50), page + 1))}
                  disabled={page >= Math.ceil(totalCount / 50)}
                >
                  <span className="inline-flex items-center gap-2">
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </div>
          </AdminPanel>
        ) : null}
      </div>
    );
  }
);

const dataTableColumns: Array<{
  accessor: keyof CompanyRecord | 'startAt';
  title: string;
  render?: (record: CompanyRecord) => React.ReactNode;
}> = [
  { accessor: 'id', title: 'ID' },
  { accessor: 'name', title: '이름' },
  { accessor: 'type', title: '유형' },
  { accessor: 'address', title: '주소' },
  {
    accessor: 'startAt',
    title: '설립년도',
    render: ({ startAt }) => formatStartAt(startAt),
  },
];
