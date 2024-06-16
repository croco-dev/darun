'use client';

import { bind } from '@croco/utils-structure-react';
import { ContentArea } from '@darun/ui-foundation';
import { Flex, VStack } from '@kuma-ui/core';
import { ProductTableOfContent } from '@products/components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <Flex height={'40px'} />}
    <VStack
      bg={'colors.dark.000'}
      borderY={'1px solid'}
      borderColor={'colors.dark.100'}
      top={0}
      width={'100%'}
      zIndex={100}
      position={isFixed ? 'fixed' : 'relative'}
      boxShadow={isFixed ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'}
    >
      <ContentArea>
        <VStack>
          <ProductTableOfContent />
        </VStack>
      </ContentArea>
    </VStack>
  </>
));
