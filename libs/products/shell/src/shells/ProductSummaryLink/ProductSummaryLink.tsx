import { ProductLinks } from '../../components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <div className="flex gap-2 pb-2 pt-1 overflow-x-auto">
    <ProductLinks slug={slug} />
  </div>
);
