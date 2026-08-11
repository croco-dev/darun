import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { ProductBySlugOnProductCompanyDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';


gql`
  query ProductBySlugOnProductCompany($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      ownedCompany {
        id
        name
        type
        address
        startAt
      }
    }
  }
`;

type ProductCompanyProps = {
  slug: string;
};

export function useProductCompany({ slug }: ProductCompanyProps) {
  const locale = useLocale();
  const { data } = useSuspenseQuery(ProductBySlugOnProductCompanyDocument, {
    variables: {
      slug,
      locale,
    },
  });
  return { company: data?.productBySlug?.ownedCompany };
}
