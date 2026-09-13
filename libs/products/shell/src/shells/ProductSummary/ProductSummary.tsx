import { Link } from '@darun/utils-router';
import { ProductInformation, ProductUserAction } from '../../components';

type ProductSummaryProps = { slug: string; infoLinkHref?: string };

export const ProductSummary = ({ slug, infoLinkHref }: ProductSummaryProps) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
    <div className="min-w-0 flex-1" style={{ viewTransitionName: `product-${slug}` }}>
      {infoLinkHref ? (
        <Link
          href={infoLinkHref}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
        >
          <ProductInformation slug={slug} />
        </Link>
      ) : (
        <ProductInformation slug={slug} />
      )}
    </div>
    <div className="shrink-0">
      <ProductUserAction slug={slug} />
    </div>
  </div>
);
