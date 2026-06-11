import { ProductCompanyInfo } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody, AdminActions } from '@darun/ui-admin';

export const ProductDetailCompanySection = ({ slug }: { slug: string }) => {
  return (
    <AdminPanel>
      <AdminSectionHeader title="운영사 관리" />
      <AdminSectionBody>
        <ProductCompanyInfo slug={slug} />
        <AdminActions>
          <Button variant="contained" color="primary" as="a" href={`/products/${slug}/company/new`}>
            정보 수정
          </Button>
        </AdminActions>
      </AdminSectionBody>
    </AdminPanel>
  );
};
