import { ProductLinks } from '../../components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1 scrollbar-hide">
    <ProductLinks slug={slug} />
  </div>
);
