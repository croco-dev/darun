'use client';

import { ContentArea } from '@darun/ui-foundation';
import { Layout } from '@darun/ui-layout';
import { VStack, Text } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { SearchProductResult } from '../search/shells/SearchProductResult';

type Props = { searchParams: { [key: string]: string | string[] | undefined } };

export function SearchProductPage({ searchParams }: Props) {
  const t = useTranslations('Search');

  if (!searchParams.query) {
    return (
      <Layout>
        <VStack as={'main'} width={'100%'} py={'32px'}>
          <ContentArea>
            <VStack gap={'12px'}>
              <Text
                fontWeight={'fontWeights.semibold'}
                color={'colors.dark.800'}
                fontSize={'22px'}
                letterSpacing={'-.2px'}
                textAlign={'center'}
              >
                {t('page.empty.title')}
              </Text>
              <Text fontWeight={'fontWeights.medium'} color={'colors.dark.500'} fontSize={'16px'} textAlign={'center'}>
                {t('page.empty.description')}
              </Text>
            </VStack>
          </ContentArea>
        </VStack>
      </Layout>
    );
  }

  return (
    <Layout>
      <VStack as={'main'} width={'100%'} py={'20px'}>
        <ContentArea>
          <VStack gap="20px">
            <Text fontWeight={'fontWeights.semibold'} fontSize={'22px'} letterSpacing={'-.2px'}>
              {t('page.resultTitle', { query: searchParams.query as string })}
            </Text>
            <SearchProductResult query={searchParams.query as string} />
          </VStack>
        </ContentArea>
      </VStack>
    </Layout>
  );
}
