import { ProductLinks } from '../../components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <div className="-mx-1 flex flex-wrap items-center gap-2.5 px-1 py-1">
    <ProductLinks slug={slug} />
  </div>
);
