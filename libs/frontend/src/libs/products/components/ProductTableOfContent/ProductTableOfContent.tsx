import { bind } from '@croco/utils-structure-react';
import { TextButton } from '@darun/ui-foundation';
import { HStack } from '@kuma-ui/core';

import { useProductTableOfContent } from './useProductTableOfContent';

export const ProductTableOfContent = bind(useProductTableOfContent, ({}) => (
  <HStack py={'8px'} gap={'4px'}>
    <TextButton isActive>Toc인데</TextButton>
    <TextButton>아직 미구현이에요</TextButton>
  </HStack>
));
