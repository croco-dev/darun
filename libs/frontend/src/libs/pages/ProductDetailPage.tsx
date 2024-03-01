import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import {
  ProductAlternativeSection,
  ProductDescriptionSection,
  ProductPhotoSection,
  ProductTocSection,
  ProductSummary,
  ProductSummaryLink,
} from '@products/shells';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack as={'main'} width={'100%'}>
      <VStack gap={'2px'} mb={'12px'}>
        <ContentArea>
          <VStack gap={'8px'}>
            <ProductSummary slug={slug} />
            <ProductSummaryLink slug={slug} />
          </VStack>
        </ContentArea>
      </VStack>
      <ProductTocSection />
      <ContentArea>
        <VStack>
          <ProductDescriptionSection slug={slug} />
          <ProductPhotoSection slug={slug} />
          <ProductAlternativeSection slug={slug} />
        </VStack>
      </ContentArea>
    </VStack>
  </Layout>
);
