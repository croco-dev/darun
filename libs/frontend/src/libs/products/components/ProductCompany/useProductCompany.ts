import { gql } from '@apollo/client';
import { useProductBySlugOnProductCompanySuspenseQuery } from './__generated__/useProductCompany';

gql`
  query ProductBySlugOnProductCompany($slug: String!) {
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
  const { data } = useProductBySlugOnProductCompanySuspenseQuery({
    variables: {
      slug,
    },
  });
  return { company: data.productBySlug?.ownedCompany };
}
