'use client';

import { bind } from '@croco/utils-structure-react';
import { VStack, Text, HStack, Flex } from '@kuma-ui/core';
import Image from 'next/image';
import { useRecentProductList } from './useRecentProductList';

export const RecentProductList = bind(useRecentProductList, ({ products }) => (
  <VStack>
    {products.map(product => (
      <HStack key={product.id} gap={12}>
        <Flex w="max-content" h="max-content" border="1px solid rgba(0, 0, 0, 0.15)" borderRadius={12}>
          <Image src={product.logoUrl} alt={`${product.name} logo`} width={72} height={72} />
        </Flex>
        <VStack gap={4}>
          <Text fontSize={18} m={0}>
            {product.name}
          </Text>
          <Text fontSize={14} m={0}>
            {product.name}
          </Text>
        </VStack>
      </HStack>
    ))}
  </VStack>
));
