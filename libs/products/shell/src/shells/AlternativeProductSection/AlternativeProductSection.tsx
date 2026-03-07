'use client';

import { Text, VStack } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { ProductAlternativeList } from '../../components/ProductAlternativeList';

type AlternativeProductSectionProps = {
  slug: string;
};

export const AlternativeProductSection = ({ slug }: AlternativeProductSectionProps) => {
  const t = useTranslations('Alternative');

  return (
    <VStack as="section" gap={'20px'} py={'16px'}>
      <VStack gap={'4px'}>
        <Text fontWeight={'fontWeights.semibold'} fontSize={'24px'} color={'colors.dark.900'} letterSpacing={'-.4px'}>
          {t('more.title')}
        </Text>
        <Text fontWeight={'fontWeights.medium'} fontSize={'16px'} color={'colors.dark.600'} letterSpacing={'-.4px'}>
          {t('more.description')}
        </Text>
      </VStack>
      <ProductAlternativeList slug={slug} />
    </VStack>
  );
};
