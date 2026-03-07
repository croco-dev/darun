'use client';

import { bind } from '@croco/utils-structure-react';
import { ProductFeatureGridList, ProductItem } from '@darun/products-shell';
import { Link } from '@darun/utils-router';
import { Flex, HStack, Text, VStack } from '@kuma-ui/core';
import { useTranslations } from 'next-intl';
import { useSearchProductList } from './useSearchProductList';

type SearchProductListViewProps = {
  products: NonNullable<ReturnType<typeof useSearchProductList>['products']>;
};

export const SearchProductList = bind(useSearchProductList, ({ products }: SearchProductListViewProps) => {
  const t = useTranslations('Search');

  if (products.length === 0)
    return (
      <VStack py={'48px'} gap={'8px'}>
        <Text textAlign={'center'} color={'colors.dark.800'} fontSize={'20px'} fontWeight={'fontWeights.semibold'}>
          {t('list.empty.title')}
        </Text>
        <Text textAlign={'center'} color={'colors.dark.600'} fontSize={'14px'} fontWeight={'fontWeights.medium'}>
          {t('list.empty.description')}
        </Text>
      </VStack>
    );
  return (
    <VStack gap={'20px'}>
      {products.map(product => (
        <Link href={`/products/${product.slug}`} key={product.id}>
          <Flex
            px="18px"
            py="16px"
            borderRadius="8px"
            border="1px solid rgba(0, 0, 0, 0.12)"
            bg="#fff"
            boxShadow="0px 2px 8px 0px rgba(0, 0, 0, 0.04)"
            transition={'all 0.2s ease'}
            _hover={{
              borderColor: 'rgba(0, 0, 0, 0.14)',
              boxShadow: '0px 4px 8px 2px rgba(0, 0, 0, 0.08)',
            }}
          >
            <VStack gap="12px" w={'100%'}>
              <HStack>
                <ProductItem
                  name={product.name}
                  summary={product.summary}
                  logoSize={'small'}
                  logoUrl={product.logoUrl}
                  tagVariant={'circle'}
                  tags={product.tags.map(tag => tag.name)}
                  maxTagItems={2}
                />
              </HStack>
              <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
              <VStack gap={'24px'}>
                {product.features && product.features.length > 0 && (
                  <>
                    <VStack gap={'12px'}>
                      <VStack gap="4px" width={'fit-content'}>
                        <Text
                          color="colors.dark.500"
                          fontWeight="fontWeights.bold"
                          fontSize="16px"
                          letterSpacing="-2.4%"
                        >
                          {t('list.feature.title')}
                        </Text>
                        <Flex height="2px" bg="colors.dark.400" />
                      </VStack>
                      <ProductFeatureGridList
                        features={product.features.map(item => ({
                          ...item,
                          summary: item.summary ?? undefined,
                        }))}
                      />
                    </VStack>
                  </>
                )}
              </VStack>
            </VStack>
          </Flex>
        </Link>
      ))}
    </VStack>
  );
});
