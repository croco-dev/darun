import { Button } from '@darun/ui';
import { AdminEmptyState, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { Pencil } from 'lucide-react';
import { useProductFeatureTable } from './useProductFeatureTable';

export const ProductFeatureTable = bind(useProductFeatureTable, ({ features, loading, editFeature }) => {
  if (loading) {
    return <AdminLoadingState />;
  }

  if (!features || features.length === 0) {
    return <AdminEmptyState title="기능이 한 개도 없습니다." description="새 기능을 추가해보세요." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse table-fixed text-sm">
        <thead className="bg-surface-100 text-left text-dark-900">
          <tr>
            <th className="w-[70px] border-b border-r border-dark-200 px-4 py-3 font-medium text-center">이모지</th>
            <th className="w-[180px] border-b border-r border-dark-200 px-4 py-3 font-medium">이름</th>
            <th className="border-b border-r border-dark-200 px-4 py-3 font-medium">설명</th>
            <th className="w-[120px] border-b border-dark-200 px-4 py-3 last:border-r-0"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {features.map(feature => (
            <tr key={feature.id} className="border-b border-dark-200 transition hover:bg-surface-100 last:border-b-0">
              <td className="border-r border-dark-200 px-4 py-3 text-center">
                <span className="p-1 text-base font-medium text-dark-900">{feature.emoji}</span>
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
                    className="gap-2 shrink-0"
                  >
                    <Pencil size={16} />
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
});
