import { HStack } from '@kuma-ui/core';
import { ProductInformation, ProductUserAction } from '@products/components';

type ProductSummaryProps = { slug: string };

export const ProductSummary = ({ slug }: ProductSummaryProps) => (
  <HStack py="16px" justifyContent={'space-between'} alignItems={'center'}>
    <ProductInformation slug={slug} />
    <ProductUserAction />
  </HStack>
);
