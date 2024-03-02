import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import {
  ProductAlternativeSection,
  ProductDetailHeader,
  ProductDescriptionSection,
  ProductPhotoSection,
  ProductDetailFeatureSection,
  ProductDetailCompanySection,
} from '@products/shells';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack as={'main'} width={'100%'}>
      <ProductDetailHeader slug={slug} />
      <ContentArea>
        <VStack>
          <ProductDescriptionSection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductDetailFeatureSection />
          <ProductAlternativeSection slug={slug} />
          <ProductDetailCompanySection slug={slug} />
        </VStack>
      </ContentArea>
    </VStack>
  </Layout>
);
