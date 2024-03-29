'use client';

import { Text, VStack } from '@kuma-ui/core';
import { AlternativeProductList } from '@products/components';

type ProductAlternativeSectionProps = {
  slug: string;
};
export const ProductAlternativeSection = ({ slug }: ProductAlternativeSectionProps) => (
  <VStack as="section" gap={'20px'} py={'16px'}>
    <VStack gap={'6px'}>
      <Text
        as={'h2'}
        id={'darun'}
        fontWeight={'fontWeights.semibold'}
        fontSize={'24px'}
        color={'colors.dark.900'}
        letterSpacing={'-.4px'}
      >
        다른 서비스
      </Text>
      <Text
        as={'p'}
        fontWeight={'fontWeights.medium'}
        fontSize={'15px'}
        color={'colors.dark.600'}
        letterSpacing={'-.06px'}
      >
        비슷한 기능을 제공하는 서비스들을 보여드립니다.
      </Text>
    </VStack>
    <AlternativeProductList slug={slug} />
  </VStack>
);
