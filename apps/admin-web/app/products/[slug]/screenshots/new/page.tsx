import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { NewProductScreenshotFormSection } from '../../../../../features/products/NewProductScreenshotFormSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewProductScreenshotPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PageShell title="서비스에 스크린샷 추가" backHref={`/products/${slug}`}>
      <AdminPanel>
        <AdminSectionHeader title="스크린샷" />
        <AdminSectionBody>
          <NewProductScreenshotFormSection productSlug={slug} />
        </AdminSectionBody>
      </AdminPanel>
    </PageShell>
  );
}
