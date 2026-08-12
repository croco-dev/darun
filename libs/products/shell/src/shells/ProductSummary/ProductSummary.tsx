import { ProductInformation, ProductUserAction } from '../../components';

type ProductSummaryProps = { slug: string };

export const ProductSummary = ({ slug }: ProductSummaryProps) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
    <div className="min-w-0 flex-1" style={{ viewTransitionName: `product-${slug}` }}>
      <ProductInformation slug={slug} />
    </div>
    <div className="shrink-0">
      <ProductUserAction slug={slug} />
    </div>
  </div>
);
