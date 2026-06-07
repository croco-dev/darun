import { gql } from '@apollo/client';
import { AnalyticsEvents, track } from '@darun/analytics-client';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { useProductBySlugOnProductInformationSuspenseQuery } from './__generated__/useProductInformation';

gql`
  query ProductBySlugOnProductInformation($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      name
      summary
      description
      logoUrl
      tags {
        id
        name
      }
    }
  }
`;

type ProductInformationProps = { slug: string };

export function useProductInformation({ slug }: ProductInformationProps) {
  const locale = useLocale();
  const { data } = useProductBySlugOnProductInformationSuspenseQuery({
    variables: { slug, locale },
  });

  useEffect(() => {
    const sourceParam = new URLSearchParams(window.location.search).get('from');
    if (sourceParam === 'search') {
      track(AnalyticsEvents.PRODUCT_DETAIL_VIEWED, {
        productSlug: slug,
        source: 'search',
      });
    }
  }, [slug]);

  return {
    name: data?.productBySlug?.name,
    summary: data?.productBySlug?.summary,
    logoUrl: data?.productBySlug?.logoUrl,
    tags: data?.productBySlug?.tags,
  };
}
