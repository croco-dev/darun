import { AdminPanel, AdminSectionBody, AdminSectionHeader, PageShell } from '@darun/ui-admin';
import { NewProductFlowPanel } from '../../../../../features/products/ProductFlowEditor/NewProductFlowPanel';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewProductFlowPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PageShell title="UX 플로 추가" backHref={`/products/${slug}`}>
      <AdminPanel>
        <AdminSectionHeader title="새 플로" />
        <AdminSectionBody>
          <NewProductFlowPanel slug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
