'use client';

import { Text, VStack } from '@kuma-ui/core';
import { ProductFeatureList } from '@products/components';
import { useTranslations } from 'next-intl';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <VStack as="section" gap={'20px'} py={'16px'}>
      <Text
        as={'h2'}
        id={'features'}
        fontWeight={'fontWeights.semibold'}
        fontSize={'24px'}
        color={'colors.dark.900'}
        letterSpacing={'-.4px'}
        className={'darun-heading'}
      >
        {t('feature.title')}
      </Text>
      <ProductFeatureList slug={slug} />
    </VStack>
  );
};
