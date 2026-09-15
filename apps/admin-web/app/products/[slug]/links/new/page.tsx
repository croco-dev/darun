import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { NewProductLinkSection } from '../../../../../features/products/NewProductLinkSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewProductLinkPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PageShell title="서비스에 링크 추가" backHref={`/products/${slug}`}>
      <AdminPanel>
        <AdminSectionHeader title="링크" />
        <AdminSectionBody>
          <NewProductLinkSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
