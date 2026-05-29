import { ProductLinkTable } from '@darun/products-feature';
import { Button } from '@darun/ui';

type ProductDetailLinkSectionProps = {
  slug: string;
};

export const ProductDetailLinkSection = ({ slug }: ProductDetailLinkSectionProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-0">
        <h3 className="text-lg font-semibold">링크 관리</h3>
        <p className="text-gray-500 font-medium text-sm">
          서비스 정보에서 목차 위에 표시되는 링크 버튼에 뜨는 버튼들을 관리합니다.
        </p>
      </div>
      <Button variant="base" as="a" href={`/products/${slug}/links/new`}>
        새 링크 추가
      </Button>
    </div>
    <div className="border border-gray-200 shadow-sm rounded-md">
      <div className="border-b p-4">
        <ProductLinkTable slug={slug} />
      </div>
    </div>
  </div>
);
