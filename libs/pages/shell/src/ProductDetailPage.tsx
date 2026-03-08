import { ContentArea } from "@darun/ui-foundation";
import { Layout } from "@darun/ui-layout";
import { VStack } from "@kuma-ui/core";
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

export const ProductDetailPage = ({
  params: { slug },
}: {
  params: { slug: string };
}) => (
  <Layout>
    <VStack as={"main"} width={"100%"}>
      <VStack gap={"2px"} mb={"12px"}>
        <ContentArea>
          <VStack gap={"8px"}>
            <ProductSummary slug={slug} />
            <ProductSummaryLink slug={slug} />
          </VStack>
        </ContentArea>
      </VStack>
      <ProductTocSection />
      <ContentArea>
        <VStack id={"detail-content"}>
          <ProductDescriptionSection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductDetailFeatureSection slug={slug} />
          <ProductAlternativeSection slug={slug} />
          <ProductDetailCompanySection slug={slug} />
        </VStack>
      </ContentArea>
    </VStack>
  </Layout>
);
