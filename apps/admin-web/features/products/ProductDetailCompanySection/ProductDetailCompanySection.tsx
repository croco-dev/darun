import { ProductCompanyInfo } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { Link } from '@darun/utils-router';

export const ProductDetailCompanySection = ({ slug }: { slug: string }) => {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">운영사 관리</h3>
        </div>
        <div className="border border-gray-200 shadow-sm rounded-md">
          <div className="border-b p-4">
            <ProductCompanyInfo slug={slug} />
            <div className="h-3"></div>
            <Link href={`/products/${slug}/company/new`}>
              <Button variant="base">정보 수정</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
