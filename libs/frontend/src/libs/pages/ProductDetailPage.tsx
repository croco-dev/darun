import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import {
  ProductAlternativeSection,
  ProductDetailHeader,
  ProductSummarySection,
  ProductPhotoSection,
} from '@products/shells';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack as={'main'} width={'100%'}>
      <ProductDetailHeader slug={slug} />
      <ContentArea>
        <VStack>
          <ProductSummarySection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductAlternativeSection />
        </VStack>
      </ContentArea>
    </VStack>
  </Layout>
);
