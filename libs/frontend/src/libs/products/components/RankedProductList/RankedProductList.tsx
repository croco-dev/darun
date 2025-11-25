'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Grid, HStack, Text } from '@kuma-ui/core';
import { ProductItem } from '@products/uis';
import { useRankedProductList } from './useRankedProductList';

export const RankedProductList = bind(useRankedProductList, ({ products }) => (
  <Grid width={'100%'} gap={'20px'} gridTemplateColumns={['repeat(1, 1fr)', 'repeat(2, 1fr)']}>
    {products.map((product, index) => (
      <Link key={product.id} href={`/products/${product.slug}`}>
        <HStack gap={'12px'} alignItems={'center'}>
          <Text
            fontSize={'18px'}
            fontWeight={'fontWeights.bold'}
            color={'colors.dark.400'}
            minWidth={'28px'}
            textAlign={'center'}
          >
            {index + 1}
          </Text>
          <ProductItem
            name={product.name}
            logoUrl={product.logoUrl}
            logoSize={'medium'}
            summary={product.summary}
            tags={product.tags.map(tag => tag.name)}
            maxTagItems={2}
          />
        </HStack>
      </Link>
    ))}
  </Grid>
));
