'use client';

import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { SectionHeader } from '@darun/ui';
import { useLocale, useTranslations } from 'next-intl';
import { ProductCard } from '../../components/ProductCard';

const RELATED_PRODUCTS_QUERY = gql`
  query RelatedProducts($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
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
  productBySlug: {
    alternatives: Alternative[];
  } | null;
};

export const RelatedProductsSection = ({ slug }: { slug: string }) => {
  const locale = useLocale();
  const t = useTranslations('ProductDetail');
  const { data } = useSuspenseQuery<QueryResult>(RELATED_PRODUCTS_QUERY, {
    variables: { slug, locale },
  });

  const alternatives = data?.productBySlug?.alternatives ?? [];

  if (alternatives.length === 0) return null;

  const handleClick = (toSlug: string, position: number) => {
    track(AnalyticsEvents.RELATED_PRODUCT_CLICKED, {
      fromSlug: slug,
      toSlug,
      position,
    });
  };

  return (
    <div data-testid="related-products-section">
      <SectionHeader title={t('related.title')} />
      <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:gap-5">
        {alternatives.slice(0, 4).map((alt, index) => (
          <ProductCard
            key={alt.id}
            product={alt}
            href={`/${locale}/products/${alt.slug}?from=related`}
            source="related"
            onClick={() => handleClick(alt.slug, index + 1)}
          />
        ))}
      </div>
    </div>
  );
};
