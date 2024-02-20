import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { ProductDetailHeader, ProductSummarySection } from '@products/shells';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack as={'main'} width={'100%'}>
      <ProductDetailHeader slug={slug} />
      <ContentArea>
        <ProductSummarySection slug={slug} />
      </ContentArea>
    </VStack>
  </Layout>
);
