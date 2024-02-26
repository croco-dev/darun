import { gql } from '@apollo/client';
import { useGetCompaniesInfoOnProductCompanySuspenseQuery } from './__generated__/useProductCompany';

gql`
  query GetCompaniesInfoOnProductCompany($slug: String!) {
    productBySlug(slug: $slug) {
      id
      ownedCompany {
        id
        name
        type
        region
        address
        size
        startAt
      }
    }
  }
`;

type ProductCompanyProps = {
  slug: string;
};

export function useProductCompany({ slug }: ProductCompanyProps) {
  const { data } = useGetCompaniesInfoOnProductCompanySuspenseQuery({
    variables: {
      slug,
    },
  });
  return { company: data.productBySlug?.ownedCompany };
}
