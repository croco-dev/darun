import { EditProductCompany } from '@darun/products-feature';
import { AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';

export function ProductCompanyEditSection({ slug }: { slug: string }) {
  return (
    <AdminPanel>
      <AdminSectionHeader title="회사 수정" />
      <AdminSectionBody>
        <EditProductCompany slug={slug} />
      </AdminSectionBody>
    </AdminPanel>
  );
}
