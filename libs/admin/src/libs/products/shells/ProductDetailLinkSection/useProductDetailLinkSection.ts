type ProductDetailLinkSectionProps = {
  slug: string;
};

export function useProductDetailLinkSection({ slug }: ProductDetailLinkSectionProps) {
  return { slug };
}
