import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { ProductDetailHeader } from '@products/shells';

export const ProductAlternativePage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack>
      <VStack as={'main'} width={'100%'}>
        <ProductDetailHeader slug={slug} />
        <ContentArea>
          <VStack></VStack>
        </ContentArea>
      </VStack>
    </VStack>
  </Layout>
);
