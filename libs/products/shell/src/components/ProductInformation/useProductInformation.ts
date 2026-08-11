import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductBySlugOnProductInformationDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';


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
  const { data } = useSuspenseQuery(ProductBySlugOnProductInformationDocument, {
    variables: { slug, locale },
  });

  return {
    name: data?.productBySlug?.name,
    summary: data?.productBySlug?.summary,
    logoUrl: data?.productBySlug?.logoUrl,
    tags: data?.productBySlug?.tags,
  };
}
