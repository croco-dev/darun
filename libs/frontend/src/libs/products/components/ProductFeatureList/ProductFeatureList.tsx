import { bind } from '@croco/utils-structure-react';
import { VStack } from '@kuma-ui/core';
import { FeatureItem } from '@products/uis';
import { useProductFeatureList } from './useProductFeatureList';

export const ProductFeatureList = bind(useProductFeatureList, ({}) => (
  <VStack>
    <FeatureItem />
  </VStack>
));
