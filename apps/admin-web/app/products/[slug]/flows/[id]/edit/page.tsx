import { AdminPanel, AdminSectionBody, AdminSectionHeader, PageShell } from '@darun/ui-admin';
import { EditProductFlowPanel } from '../../../../../../features/products/ProductFlowEditor/EditProductFlowPanel';

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function EditProductFlowPage({ params }: PageProps) {
  const { slug, id } = await params;
  return (
    <PageShell title="UX 플로 수정" backHref={`/products/${slug}`}>
      <AdminPanel>
        <AdminSectionHeader title="플로 편집" />
        <AdminSectionBody>
          <EditProductFlowPanel slug={slug} flowId={id} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
