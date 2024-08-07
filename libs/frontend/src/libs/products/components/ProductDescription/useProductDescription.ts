type ProductSummaryProps = {
  description: string;
};

export function useProductDescription({ description }: ProductSummaryProps) {
  return { description };
}
