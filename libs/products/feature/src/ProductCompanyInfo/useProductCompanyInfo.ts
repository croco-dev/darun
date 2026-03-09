import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductCompanyInfoQuery } from './__generated__/useProductCompanyInfo';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnProductCompanyInfo($slug: String!) {
    tempProductBySlug(slug: $slug) {
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

export function useProductCompanyInfo({ slug }: { slug: string }) {
  const { data } = useTempProductBySlugOnProductCompanyInfoQuery({
    variables: { slug },
  });
  return { company: data?.tempProductBySlug?.ownedCompany };
}
