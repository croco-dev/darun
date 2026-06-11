import { ProductLinkTable } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';

type ProductDetailLinkSectionProps = {
  slug: string;
};

export const ProductDetailLinkSection = ({ slug }: ProductDetailLinkSectionProps) => (
  <AdminPanel>
    <AdminSectionHeader
      rightSide={
        <Button variant="contained" color="primary" as="a" href={`/products/${slug}/links/new`}>
          새 링크 추가
        </Button>
      }
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium text-dark-900">링크 관리</h2>
        <p className="text-xs text-dark-500">
          서비스 정보에서 목차 위에 표시되는 링크 버튼에 뜨는 버튼들을 관리합니다.
        </p>
      </div>
    </AdminSectionHeader>
    <AdminSectionBody className="p-0">
      <ProductLinkTable slug={slug} />
    </AdminSectionBody>
  </AdminPanel>
);
