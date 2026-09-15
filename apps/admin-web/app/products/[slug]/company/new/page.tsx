import { PageShell } from '@darun/ui-admin';
import { ProductCompanyEditSection } from '../../../../../features/products/ProductCompanyEditSection';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductCompanyEditPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <PageShell title="서비스에 회사 연결하기" backHref={`/products/${slug}`}>
      <ProductCompanyEditSection slug={slug} />
    </PageShell>
  );
}
