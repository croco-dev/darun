import { VStack, Text } from '@kuma-ui/core';
import { ProductDescription } from '@products/components';

type ProductDescriptionSectionProps = {
  slug: string;
};
export const ProductDescriptionSection = ({ slug }: ProductDescriptionSectionProps) => (
  <VStack as="section" gap={'20px'} py={['24px', '16px']}>
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
    <ProductDescription slug={slug} />
  </VStack>
);
