import { HStack } from '@kuma-ui/core';
import { ProductInformation } from '@products/components';

type ProductSummaryProps = {
  name: string;
  summary?: string;
  logoUrl?: string;
};

export const ProductSummary = ({ name, summary, logoUrl }: ProductSummaryProps) => (
  <HStack py="16px" justifyContent={'space-between'} alignItems={'center'}>
    <ProductInformation name={name} summary={summary} logoUrl={logoUrl} />
  </HStack>
);
