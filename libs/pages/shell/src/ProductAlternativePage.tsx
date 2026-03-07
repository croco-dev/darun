import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { Link } from '@darun/utils-router';
import { Flex, VStack } from '@kuma-ui/core';
import { FAQSection, FAQItem } from '@products/components';
import { AlternativeProductSection, ProductSummary } from '@products/shells';

export const ProductAlternativePage = ({
  params: { slug },
  faqItems,
}: {
  params: { slug: string };
  faqItems?: FAQItem[];
}) => (
  <Layout>
    <VStack>
      <VStack as={'main'} width={'100%'}>
        <VStack gap={'2px'} mb={'4px'}>
          <ContentArea>
            <Link href={`/products/${slug}`}>
              <ProductSummary slug={slug} />
            </Link>
          </ContentArea>
        </VStack>
        <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
        <ContentArea>
          <VStack py="12px">
            <AlternativeProductSection slug={slug} />
          </VStack>
        </ContentArea>
        {faqItems && faqItems.length > 0 && (
          <ContentArea>
            <FAQSection items={faqItems} />
          </ContentArea>
        )}
      </VStack>
    </VStack>
  </Layout>
);
