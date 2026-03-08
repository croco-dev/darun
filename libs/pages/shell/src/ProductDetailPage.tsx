import {
  ProductDetailCompanySection,
  ProductDetailFeatureSection,
  ProductAlternativeSection,
  ProductDescriptionSection,
  ProductPhotoSection,
  ProductSummary,
  ProductSummaryLink,
  ProductTocSection,
} from "@darun/products-shell";
import { ContentArea } from "@darun/ui";
import { Layout } from "@darun/ui-layout";

export const ProductDetailPage = ({
  params: { slug },
}: {
  params: { slug: string };
}) => (
  <Layout>
    <main className="flex w-full flex-col">
      <div className="mb-3 flex flex-col gap-0.5">
        <ContentArea>
          <div className="flex flex-col gap-2">
            <ProductSummary slug={slug} />
            <ProductSummaryLink slug={slug} />
          </div>
        </ContentArea>
      </div>
      <ProductTocSection />
      <ContentArea>
        <div id="detail-content" className="flex flex-col">
          <ProductDescriptionSection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductDetailFeatureSection slug={slug} />
          <ProductAlternativeSection slug={slug} />
          <ProductDetailCompanySection slug={slug} />
        </div>
      </ContentArea>
    </main>
  </Layout>
);
