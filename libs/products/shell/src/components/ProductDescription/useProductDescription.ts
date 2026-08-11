import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductBySlugOnProductSummaryDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';


gql`
  query ProductBySlugOnProductSummary($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      description
    }
  }
`;

type ProductSummaryProps = {
  slug: string;
};

export function useProductDescription({ slug }: ProductSummaryProps) {
  const locale = useLocale();
  const { data } = useSuspenseQuery(ProductBySlugOnProductSummaryDocument, {
    variables: {
      slug,
      locale,
    },
  });

  return {
    description: data?.productBySlug?.description ?? '',
  };
}
