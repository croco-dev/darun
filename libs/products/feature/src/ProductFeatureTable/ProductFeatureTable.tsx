'use client';

import { Button, Pencil } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useProductFeatureTable } from './useProductFeatureTable';

export const ProductFeatureTable = bind(
  useProductFeatureTable,
  ({ features, loading, error, editFeature, refetch }) => {
    if (loading) {
      return <AdminLoadingState />;
    }

    if (error) {
      return (
        <AdminErrorState
          error={error}
          action={
            <Button
              type="button"
              onClick={() => refetch()}
              variant="contained"
              color="primary"
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              다시 시도
            </Button>
          }
        />
      );
    }

    if (!features || features.length === 0) {
      return <AdminEmptyState title="등록된 기능이 없습니다." description="새로운 기능을 추가해 보세요." />;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed text-sm" aria-label="기능 목록">
          <thead className="bg-surface-100 text-left text-dark-900">
            <tr>
              <th className="w-[70px] border-b border-r border-dark-200 px-4 py-3 font-medium text-center">이모지</th>
              <th className="w-[180px] border-b border-r border-dark-200 px-4 py-3 font-medium">이름</th>
              <th className="border-b border-r border-dark-200 px-4 py-3 font-medium">설명</th>
              <th className="w-[120px] border-b border-dark-200 px-4 py-3 last:border-r-0">
                <span className="sr-only">작업</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {features.map(feature => (
              <tr key={feature.id} className="border-b border-dark-200 transition hover:bg-surface-100 last:border-b-0">
                <td className="border-r border-dark-200 px-4 py-3 text-center">
                  <span className="p-1 text-base font-medium text-dark-900 select-none">{feature.emoji}</span>
                </td>
                <td className="border-r border-dark-200 px-4 py-3">
                  <div className="truncate text-sm font-medium text-dark-900" title={feature.name ?? undefined}>
                    {feature.name}
                  </div>
                </td>
                <td className="border-r border-dark-200 px-4 py-3">
                  <div className="truncate text-sm text-dark-500" title={feature.summary ?? undefined}>
                    {feature.summary}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => editFeature(feature.id)}
                      variant="contained"
                      color="secondary"
                      size="sm"
                      className="gap-2 shrink-0 active:scale-[0.98] motion-reduce:transform-none"
                    >
                      <Pencil size={16} className="shrink-0" aria-hidden="true" />
                      정보 수정
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);
