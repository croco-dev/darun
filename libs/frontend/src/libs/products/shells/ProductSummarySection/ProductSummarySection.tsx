import { VStack } from '@kuma-ui/core';
import { ProductSummary } from '../../components/ProductSummary';

type ProductSummarySectionProps = {
  slug: string;
};
export const ProductSummarySection = ({ slug }: ProductSummarySectionProps) => (
  <VStack as="section">
    <ProductSummary slug={slug} />
  </VStack>
);
