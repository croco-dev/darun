import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { AdminEmptyState, AdminLoadingState } from '@darun/ui-admin';
import { Pencil } from 'lucide-react';
import { useProductFeatureTable } from './useProductFeatureTable';

export const ProductFeatureTable = bind(useProductFeatureTable, ({ features, loading, editFeature }) => {
  if (loading) {
    return <AdminLoadingState />;
  }

  if (!features || features.length === 0) {
    return (
      <AdminEmptyState
        title="기능이 한 개도 없습니다."
        description="새 기능을 추가해보세요."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-dark-50 text-left text-dark-900">
          <tr>
            <th className="w-[60px] px-4 py-3 font-medium">이모지</th>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">설명</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-200 bg-white">
          {features.map(feature => (
            <tr key={feature.name} className="transition hover:bg-dark-50">
              <td className="px-4 py-3 text-center">
                <span className="p-1 text-base font-medium text-dark-900">{feature.emoji}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm font-medium text-dark-900">{feature.name}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm font-medium text-dark-900">{feature.summary}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => editFeature(feature.id)}
                    variant="contained"
                    color="secondary"
                    size="sm"
                    className="gap-2"
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
