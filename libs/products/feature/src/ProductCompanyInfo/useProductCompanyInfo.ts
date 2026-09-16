import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { TempProductBySlugOnProductCompanyInfoDocument } from '@darun/provider-graphql';

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

export type UseProductCompanyInfoProps = {
  slug: string;
  onConnectCompany?: () => void;
};

export function useProductCompanyInfo({ slug, onConnectCompany }: UseProductCompanyInfoProps) {
  const { data, loading, error, refetch } = useQuery(TempProductBySlugOnProductCompanyInfoDocument, {
    variables: { slug },
  });
  return {
    company: data?.tempProductBySlug?.ownedCompany,
    loading,
    error,
    refetch,
    onConnectCompany,
  };
}
