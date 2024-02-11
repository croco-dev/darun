import { VStack } from '@kuma-ui/core';
import { RecentProductList } from '@products/components';

export const RecentProductSection = () => (
  <VStack as="section">
    recent products
    <RecentProductList />
  </VStack>
);
