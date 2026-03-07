'use client';

import { VStack, Text } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { ProductDescription } from '../../components';

type ProductDescriptionSectionProps = {
  slug: string;
};
export const ProductDescriptionSection = ({ slug }: ProductDescriptionSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <VStack as="section" gap={'20px'} py={['24px', '16px']}>
      <Text
        as={'h2'}
        className={`darun-heading`}
        id={'description'}
        fontWeight={'fontWeights.semibold'}
        fontSize={24}
        color={'colors.dark.900'}
        letterSpacing={'-.4px'}
      >
        {t('description.title')}
      </Text>
      <ProductDescription slug={slug} />
    </VStack>
  );
};
