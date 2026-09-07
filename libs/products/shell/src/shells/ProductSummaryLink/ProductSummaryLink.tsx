import { ProductLinks } from '../../components';

type ProductSummaryLinkProps = { slug: string };

export const ProductSummaryLink = ({ slug }: ProductSummaryLinkProps) => (
  <div className="flex flex-wrap items-center gap-2.5">
    <ProductLinks slug={slug} />
  </div>
);
