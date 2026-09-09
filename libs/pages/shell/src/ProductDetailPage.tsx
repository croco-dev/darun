'use client';

import { ProductDetailViewTracker } from '@darun/analytics-client';
import {
  ProductAlternativeSection,
  ProductDescriptionSection,
  ProductDetailCompanySection,
  ProductDetailFeatureSection,
  ProductPhotoSection,
  ProductSummary,
  ProductSummaryLink,
  ProductTocSection,
} from '@darun/products-shell';
import { Breadcrumb, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { useLocale } from 'next-intl';

export const ProductDetailPage = ({
  params: { slug },
  productName,
}: {
  params: { slug: string; locale?: string };
  productName?: string;
}) => {
  const locale = useLocale();
  const isKo = locale === 'ko';

  return (
    <Layout>
      <ProductDetailViewTracker productSlug={slug} />
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-5 py-6 md:gap-6 md:py-8">
          <Breadcrumb
            data-testid="breadcrumb-product-detail"
            items={[
              { label: isKo ? '홈' : 'Home', href: `/${locale}/` },
              { label: productName ?? slug, ariaCurrent: 'page' },
            ]}
          />
          <ProductSummary slug={slug} />
          <ProductSummaryLink slug={slug} />
        </ContentArea>
        <ProductTocSection />
        <ContentArea id="detail-content" className="flex flex-col gap-8 py-6 md:gap-10 md:py-8">
          <ProductDescriptionSection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductDetailFeatureSection slug={slug} />
          <ProductAlternativeSection slug={slug} />
          <ProductDetailCompanySection slug={slug} />
        </ContentArea>
      </main>
    </Layout>
  );
};
