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
  RelatedProductsSection,
} from '@darun/products-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <ProductDetailViewTracker productSlug={slug} />
    <main className="flex w-full flex-col">
      <ContentArea className="flex flex-col gap-6 py-6 md:py-8">
        <ProductSummary slug={slug} />
        <RelatedProductsSection slug={slug} />
        <ProductSummaryLink slug={slug} />
      </ContentArea>
      <ProductTocSection />
      <ContentArea id="detail-content" className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
        <ProductDescriptionSection slug={slug} />
        <ProductPhotoSection slug={slug} />
        <ProductDetailFeatureSection slug={slug} />
        <ProductAlternativeSection slug={slug} />
        <ProductDetailCompanySection slug={slug} />
      </ContentArea>
    </main>
  </Layout>
);
