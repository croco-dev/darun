import { gql } from '@apollo/client';
import { ProductTagsForm } from '@darun/products-feature';
import { PageShell, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { getClient } from '@darun/utils-apollo-client/server';
import {
  ProductDetailAlternativeSection,
  ProductDetailCompanySection,
  ProductDetailDescriptionSection,
  ProductDetailFeatureSection,
  ProductDetailInfoSection,
  ProductDetailLinkSection,
  ProductDetailScreenshotSection,
  ProductDetailFlowSection,
} from '../../../features/products';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const productBasicQuery = gql`
  query ProductBasicOnAdminDetailPage($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      name
      slug
    }
  }
`;

async function getProductBasic(slug: string) {
  try {
    const { data } = await getClient({ static: true }).query<{
      tempProductBySlug?: { id: string; name: string; slug: string } | null;
    }>({
      query: productBasicQuery,
      variables: { slug },
    });
    return data?.tempProductBySlug ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBasic(slug);
  return {
    title: product?.name ? `${product.name} | 다른 관리자` : '서비스 상세 | 다른 관리자',
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBasic(slug);
  const title = product?.name ? `${product.name} 상세` : '서비스 상세';

  return (
    <PageShell title={title} backHref="/products">
      <ProductDetailInfoSection slug={slug} />
      <div className="flex flex-col gap-8 mt-6">
        <ProductDetailDescriptionSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <ProductDetailLinkSection slug={slug} />
        <ProductDetailFlowSection slug={slug} />
        <ProductDetailScreenshotSection slug={slug} />
        <ProductDetailAlternativeSection slug={slug} />
        <AdminPanel>
          <AdminSectionHeader title="태그 관리" />
          <AdminSectionBody>
            <ProductTagsForm slug={slug} />
          </AdminSectionBody>
        </AdminPanel>
        <ProductDetailCompanySection slug={slug} />
      </div>
    </PageShell>
  );
}
