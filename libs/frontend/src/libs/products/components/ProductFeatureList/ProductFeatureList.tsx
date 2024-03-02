'use client';

import { bind } from '@croco/utils-structure-react';
import { VStack } from '@kuma-ui/core';
import { FeatureItem } from '@products/uis';
import { useProductFeatureList } from './useProductFeatureList';

export const ProductFeatureList = bind(useProductFeatureList, ({ features }) => (
  <VStack>
    {features.map(feature => (
      <FeatureItem
        key={feature.id}
        name={feature.name}
        screenshots={feature.screenshots.map(item => ({
          id: item.id,
          imageAlt: item.imageAlt,
          imageUrl: item.imageUrl,
        }))}
      />
    ))}
  </VStack>
));
