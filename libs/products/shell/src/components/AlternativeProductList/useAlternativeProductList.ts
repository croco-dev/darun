import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductBySlugOnAlternativeProductListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query ProductBySlugOnAlternativeProductList($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      alternatives {
        id
        name
        slug
        summary
        logoUrl
        tags {
          id
          name
        }
      }
    }
  }
`;

type AlternativeProductListProps = {
  slug: string;
};

export function useAlternativeProductList({ slug }: AlternativeProductListProps) {
  const locale = useLocale();
  const { data } = useSuspenseQuery(ProductBySlugOnAlternativeProductListDocument, {
    variables: { slug, locale },
  });

  return {
    slug,
    alternatives: data?.productBySlug?.alternatives ?? [],
  };
}
