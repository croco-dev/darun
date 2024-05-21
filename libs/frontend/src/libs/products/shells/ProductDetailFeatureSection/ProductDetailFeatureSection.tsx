import { Text, VStack } from '@kuma-ui/core';
import { ProductFeatureList } from '@products/components';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => (
  <VStack as="section" gap={'20px'} py={'16px'}>
    <Text
      as={'h2'}
      id={'features'}
      fontWeight={'fontWeights.semibold'}
      fontSize={'24px'}
      color={'colors.dark.900'}
      letterSpacing={'-.4px'}
    >
      기능
    </Text>
    <ProductFeatureList slug={slug} />
  </VStack>
);
