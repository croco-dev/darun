import { HStack } from '@kuma-ui/core';
import { ProductInformation, ProductUserAction } from '@products/components';

type ProductSummaryProps = { slug: string };

export const ProductSummary = ({ slug }: ProductSummaryProps) => (
  <HStack py={16} justifyContent={'space-between'} alignItems={'center'}>
    <ProductInformation slug={slug} />
    <ProductUserAction slug={slug} />
  </HStack>
);
