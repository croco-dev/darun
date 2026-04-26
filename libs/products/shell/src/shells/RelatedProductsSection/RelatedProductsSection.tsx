'use client';

import { gql, useSuspenseQuery } from '@apollo/client';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { SectionHeader } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { ProductCard } from '../../components/ProductCard';

const RELATED_PRODUCTS_QUERY = gql`
  query RelatedProducts($slug: String!, $locale: String!) {
    product(slug: $slug) {
      alternatives {
        id
        name
        slug
        logoUrl
        summary
        voteCount
        tags {
          id
          name
        }
      }
    }
  }
`;

type Tag = { id: string; name: string };
type Alternative = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  summary: string;
  voteCount: number;
  tags: Tag[];
};

type QueryResult = {
  product: {
    alternatives: Alternative[];
  };
};

export const RelatedProductsSection = ({ slug }: { slug: string }) => {
  const locale = useLocale();
  const t = useTranslations('product');
  const { data } = useSuspenseQuery<QueryResult>(RELATED_PRODUCTS_QUERY, {
    variables: { slug, locale },
  });

  const alternatives = data?.product?.alternatives ?? [];

  if (alternatives.length === 0) return null;

  const handleClick = (toSlug: string, position: number) => {
    track(AnalyticsEvents.RELATED_PRODUCT_CLICKED, {
      fromSlug: slug,
      toSlug,
      position,
    });
  };

  return (
    <div data-testid="related-products-section" className="py-6">
      <SectionHeader title={t('related.title')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {alternatives.slice(0, 4).map((alt, index) => (
          <div key={alt.id} onClick={() => handleClick(alt.slug, index + 1)}>
            <ProductCard product={alt} href={`/${locale}/products/${alt.slug}`} source="related" />
          </div>
        ))}
      </div>
    </div>
  );
};
