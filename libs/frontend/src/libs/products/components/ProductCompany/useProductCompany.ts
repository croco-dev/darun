import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductBySlugOnProductCompanySuspenseQuery } from './__generated__/useProductCompany';

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
  const { data } = useProductBySlugOnProductCompanySuspenseQuery({
    variables: {
      slug,
      locale,
    },
  });
  return { company: data?.productBySlug?.ownedCompany };
}
