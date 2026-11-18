import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductOnProductLinksDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { productSectionQueryOptions } from '../ProductSectionContent';

gql`
  query ProductOnProductLinks($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      logoUrl
      links {
        id
        displayLink
        link
        title
        iconUrl
        role
        isPrimary
      }
    }
  }
`;

type ProductLinksProps = { slug: string };

export function useProductLinks({ slug }: ProductLinksProps) {
  const locale = useLocale();
  const { data, error, refetch } = useSuspenseQuery(ProductOnProductLinksDocument, {
    ...productSectionQueryOptions,
    variables: { slug, locale },
  });
  const product = data?.productBySlug;
  return {
    links: product?.links ?? [],
    productLogoUrl: product?.logoUrl,
    error,
    refetch,
  };
}
