import { VStack, Text } from '@kuma-ui/core';
import { ProductSummary } from '@products/components';

type ProductSummarySectionProps = {
  slug: string;
};
export const ProductSummarySection = ({ slug }: ProductSummarySectionProps) => (
  <VStack as="section" gap={'8px'} py={'16px'}>
    <Text
      as={'h2'}
      id={'description'}
      fontWeight={'fontWeights.semibold'}
      fontSize={24}
      color={'colors.dark.900'}
      letterSpacing={'-.4px'}
    >
      소개
    </Text>
    <ProductSummary slug={slug} />
  </VStack>
);
