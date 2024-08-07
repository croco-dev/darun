import { HStack } from '@kuma-ui/core';
import { ProductLinks } from '@products/components';
import { Suspense } from 'react';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <Suspense fallback={<></>}>
    <HStack gap={'12px'} pb={'12px'} overflowX="auto">
      <ProductLinks slug={slug} />
    </HStack>
  </Suspense>
);
