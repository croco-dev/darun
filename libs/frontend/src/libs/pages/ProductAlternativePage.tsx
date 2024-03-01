import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack } from '@kuma-ui/core';
import { ProductSummary } from '@products/shells';

export const ProductAlternativePage = ({ params: { slug } }: { params: { slug: string } }) => (
  <Layout>
    <VStack>
      <VStack as={'main'} width={'100%'}>
        <VStack gap={'2px'} mb={'12px'}>
          <ContentArea>
            <ProductSummary slug={slug} />
          </ContentArea>
        </VStack>
        <ContentArea>
          <VStack></VStack>
        </ContentArea>
      </VStack>
    </VStack>
  </Layout>
);
