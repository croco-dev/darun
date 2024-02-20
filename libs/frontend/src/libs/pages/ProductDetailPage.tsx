import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { ProductDetailHeader } from '../products/shells/ProductDetailHeader';
import { ProductSummarySection } from '../products/shells/ProductSummarySection';

export const ProductDetailPage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <ContentArea as="main">
      <VStack width={'100%'}>
        <ProductDetailHeader slug={slug} />
        <ProductSummarySection slug={slug} />
      </VStack>
    </ContentArea>
  </Layout>
);
