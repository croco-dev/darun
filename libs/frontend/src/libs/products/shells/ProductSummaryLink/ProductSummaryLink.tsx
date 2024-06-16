import { HStack } from '@kuma-ui/core';
import { ProductLinks } from '@products/components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <HStack gap={'12px'} pb={'12px'} overflowX="auto">
    <ProductLinks slug={slug} />
  </HStack>
);
