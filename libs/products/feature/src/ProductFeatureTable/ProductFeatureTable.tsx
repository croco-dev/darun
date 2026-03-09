import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Pencil } from 'lucide-react';
import { useProductFeatureTable } from './useProductFeatureTable';

export const ProductFeatureTable = bind(useProductFeatureTable, ({ features, loading, editFeature }) => {
  if (loading) {
    return <>로딩 중...</>;
  }

  if (!features || features.length === 0) {
    return <p className="text-sm font-medium text-black/50">기능이 한 개도 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10">
      <table className="min-w-[300px] divide-y divide-black/10 text-sm">
        <thead className="bg-black/[0.03] text-left text-black/60">
          <tr>
            <th className="w-[60px] px-4 py-3 font-medium">이모지</th>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">설명</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 bg-white">
          {features.map(feature => (
            <tr key={feature.name} className="transition hover:bg-black/[0.03]">
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
