import { EditProductCompany } from '@darun/products-feature';

export function ProductCompanyEditSection({ slug }: { slug: string }) {
  return (
    <div className="border border-gray-200 shadow-sm rounded-md">
      <div className="border-b p-4">
        <p className="font-medium">회사 수정</p>
      </div>
      <div className="p-4 mt-2 pb-4">
        <EditProductCompany slug={slug} />
      </div>
    </div>
  );
}
