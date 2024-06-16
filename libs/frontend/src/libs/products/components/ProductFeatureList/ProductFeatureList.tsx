'use client';

import { bind } from '@croco/utils-structure-react';
import { VStack } from '@kuma-ui/core';
import { FeatureItem } from '@products/uis';
import { useProductFeatureList } from './useProductFeatureList';

export const ProductFeatureList = bind(useProductFeatureList, ({ features }) => (
  <VStack gap={8}>
    {features.map(feature => (
      <FeatureItem
        key={feature.id}
        name={feature.name}
        emoji={feature.emoji || undefined}
        description={feature.summary ?? undefined}
        screenshots={feature.screenshots.map(item => ({
          id: item.id,
          imageAlt: item.imageAlt,
          imageUrl: item.imageUrl,
        }))}
      />
    ))}
  </VStack>
));
