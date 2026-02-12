'use client';

import { Text, VStack } from '@kuma-ui/core';
import { ProductCompany } from '@products/components';
import { useTranslations } from 'next-intl';

type ProductDetailCompanySectionProps = { slug: string };

export const ProductDetailCompanySection = ({ slug }: ProductDetailCompanySectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <VStack as="section" gap={'20px'} py={'16px'}>
      <VStack gap={'6px'}>
        <Text
          as={'h2'}
          id={'company-info'}
          fontWeight={'fontWeights.semibold'}
          fontSize={'24px'}
          color={'colors.dark.900'}
          className={'darun-heading'}
          letterSpacing={'-.4px'}
        >
          {t('company.title')}
        </Text>
        <Text
          as={'p'}
          fontWeight={'fontWeights.medium'}
          fontSize={'15px'}
          color={'colors.dark.600'}
          letterSpacing={'-.06px'}
        >
          {t('company.description')}
        </Text>
      </VStack>
      <ProductCompany slug={slug} />
    </VStack>
  );
};
