'use client';

import { VStack, Text } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { RankedProductList } from '../../components';

export const RankedProductSection = () => {
  const t = useTranslations('Ranking');

  return (
    <VStack as="section" gap={'20px'} width={'100%'} py={'16px'}>
      <VStack gap={'4px'}>
        <Text
          fontWeight={'fontWeights.semibold'}
          fontSize={['20px', '24px']}
          color={'colors.dark.900'}
          letterSpacing={'-.4px'}
          as="h2"
          className={'darun-heading'}
        >
          {t('section.title')}
        </Text>
        <Text
          fontWeight={'fontWeights.medium'}
          fontSize={['14px', '16px']}
          color={'colors.dark.600'}
          letterSpacing={'-.4px'}
          as="h2"
        >
          {t('section.description')}
        </Text>
      </VStack>
      <RankedProductList />
    </VStack>
  );
};
