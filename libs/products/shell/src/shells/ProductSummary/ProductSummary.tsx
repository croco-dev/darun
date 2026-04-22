import { ProductInformation, ProductUserAction } from '../../components';

type ProductSummaryProps = { slug: string };

export const ProductSummary = ({ slug }: ProductSummaryProps) => (
  <div className="py-4 flex justify-between items-center">
    <div style={{ viewTransitionName: `product-${slug}` }}>
      <ProductInformation slug={slug} />
    </div>
    <ProductUserAction slug={slug} />
  </div>
);
