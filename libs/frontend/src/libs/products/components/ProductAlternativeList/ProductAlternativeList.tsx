'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Flex, HStack, Text, VStack } from '@kuma-ui/core';
import { ProductFeatureGridList, ProductItem } from '@products/uis';
import { useProductAlternativeList } from './useProductAlternativeList';

export const ProductAlternativeList = bind(useProductAlternativeList, ({ products }) => {
  if (!products) return <></>;

  return (
    <VStack gap={'20px'}>
      {products.map(product => (
        <Link key={product.id} href={`/products/${product.slug}`}>
          <Flex
            px="18px"
            py="16px"
            borderRadius="8px"
            border="1px solid rgba(0, 0, 0, 0.12)"
            bg="#fff"
            boxShadow="0px 2px 8px 0px rgba(0, 0, 0, 0.08)"
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
                />
              </HStack>
              <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
              <VStack gap={'24px'}>
                <VStack gap={'12px'}>
                  <VStack gap="4px" width={'fit-content'}>
                    <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
                      기본 정보
                    </Text>
                    <Flex height="2px" bg="colors.dark.400" />
                  </VStack>
                  <Text color="colors.dark.700" fontSize="14px" lineHeight={'18px'} maxWidth={'800px'}>
                    {product.description}
                  </Text>
                </VStack>
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
                          기능
                        </Text>
                        <Flex height="2px" bg="colors.dark.400" />
                      </VStack>
                      <ProductFeatureGridList
                        features={product.features.map(item => ({ ...item, summary: item.summary ?? undefined }))}
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
