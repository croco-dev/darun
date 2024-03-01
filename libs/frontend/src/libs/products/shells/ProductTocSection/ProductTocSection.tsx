import { ContentArea } from '@darun/ui-foundation';
import { Flex, VStack } from '@kuma-ui/core';
import { ProductTableOfContent } from '@products/components';

export const ProductTocSection = () => (
  <VStack>
    <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
    <ContentArea>
      <ProductTableOfContent />
    </ContentArea>
    <Flex w={'100%'} h={'1px'} background={'colors.dark.100'} my={'2px'} />
  </VStack>
);
