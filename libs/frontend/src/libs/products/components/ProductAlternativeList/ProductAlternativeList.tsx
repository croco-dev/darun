'use client';

import { bind } from '@croco/utils-structure-react';
import { Flex, Grid, HStack, Text, VStack } from '@kuma-ui/core';
import { ProductItem } from '@products/uis';
import { useProductAlternativeList } from './useProductAlternativeList';

export const ProductAlternativeList = bind(useProductAlternativeList, ({ products }) => {
  if (!products) return <></>;

  return (
    <VStack gap={'20px'}>
      {products.map(product => (
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
                      <Text color="colors.dark.500" fontWeight="fontWeights.bold" fontSize="16px" letterSpacing="-2.4%">
                        기능
                      </Text>
                      <Flex height="2px" bg="colors.dark.400" />
                    </VStack>
                    <Grid gridTemplateColumns="repeat(3, 1fr)" gap={6}>
                      {product.features.map((feature, index) => (
                        <HStack alignItems={'center'} gap={'12px'} w={'100%'} key={index}>
                          <Flex
                            width={'42px'}
                            height={'42px'}
                            alignItems={'center'}
                            justifyContent={'center'}
                            bg={'colors.dark.100'}
                            borderStyle={'solid'}
                            borderWidth={'1px'}
                            borderColor={'rgba(0, 0, 0, 0.1)'}
                            borderRadius={'8px'}
                            flexShrink={0}
                          >
                            <Text fontSize={'20px'}>{feature.emoji}</Text>
                          </Flex>
                          <VStack>
                            <Text
                              color={'colors.dark.800'}
                              fontWeight={'fontWeights.semibold'}
                              fontSize={'15px'}
                              letterSpacing={'-.072px'}
                            >
                              {feature.name}
                            </Text>
                            <Text
                              color={'colors.dark.600'}
                              fontWeight={'fontWeights.normal'}
                              fontSize={'13px'}
                              letterSpacing={'-.05px'}
                              lineBreak={'anywhere'}
                            >
                              {feature.summary}
                            </Text>
                          </VStack>
                        </HStack>
                      ))}
                    </Grid>
                  </VStack>
                </>
              )}
            </VStack>
          </VStack>
        </Flex>
      ))}
    </VStack>
  );
});
