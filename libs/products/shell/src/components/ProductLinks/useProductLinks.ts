import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductOnProductLinksDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';
import { productSectionQueryOptions } from '../ProductSectionContent';

gql`
  query ProductOnProductLinks($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      links {
        id
        displayLink
        link
        title
        iconUrl
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
  return { links: data?.productBySlug?.links ?? [], error, refetch };
}
