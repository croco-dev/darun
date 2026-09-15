import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { NewProductFeatureFormSection } from '../../../../../features/products/NewProductFeatureFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewProductFeaturePage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PageShell title="서비스에 기능 추가" backHref={`/products/${slug}`}>
      <AdminPanel>
        <AdminSectionHeader title="기능" />
        <AdminSectionBody>
          <NewProductFeatureFormSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
