import { ProductCompanyInfo } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody, AdminActions } from '@darun/ui-admin';

import Link from 'next/link';

export const ProductDetailCompanySection = ({ slug }: { slug: string }) => {
  return (
    <AdminPanel>
      <AdminSectionHeader title="운영사 관리" />
      <AdminSectionBody>
        <ProductCompanyInfo slug={slug} />
        <AdminActions>
          <Link href={`/products/${slug}/company/new`}>
            <Button variant="contained" color="primary">
              정보 수정
            </Button>
          </Link>
        </AdminActions>
      </AdminSectionBody>
    </AdminPanel>
  );
};
