'use client';

import { VStack, Text } from '@kuma-ui/core';
import { RecentProductList } from '@products/components';
import { useTranslations } from 'next-intl';

export const RecentProductSection = () => {
  const t = useTranslations('Main');

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
          {t('recentSection.title')}
        </Text>
        <Text
          fontWeight={'fontWeights.medium'}
          fontSize={['14px', '16px']}
          color={'colors.dark.600'}
          letterSpacing={'-.4px'}
          as="h2"
        >
          {t('recentSection.description')}
        </Text>
      </VStack>
      <RecentProductList />
    </VStack>
  );
};
