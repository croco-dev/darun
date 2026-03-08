import { ProductLinks } from '../../components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <div className="flex gap-3 pb-3 overflow-x-auto">
    <ProductLinks slug={slug} />
  </div>
);
