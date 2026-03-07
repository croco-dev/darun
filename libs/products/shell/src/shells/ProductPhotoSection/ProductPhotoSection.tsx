'use client';

import { Text, VStack } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { ProductPhotos } from '../../components';

type ProductPhotoSectionProps = { slug: string };

export const ProductPhotoSection = ({ slug }: ProductPhotoSectionProps) => {
  const t = useTranslations('ProductDetail');

  return (
    <VStack as="section" gap={'20px'} py={'16px'}>
      <Text
        as={'h2'}
        id={'screenshot'}
        fontWeight={'fontWeights.semibold'}
        fontSize={24}
        color={'colors.dark.900'}
        letterSpacing={'-.4px'}
        className={'darun-heading'}
      >
        {t('photo.title')}
      </Text>
      <ProductPhotos slug={slug} />
    </VStack>
  );
};
