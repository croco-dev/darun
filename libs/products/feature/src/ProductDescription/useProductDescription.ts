import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { TempProductBySlugOnProductDescriptionDocument } from '@darun/provider-graphql';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnProductDescription($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      description
    }
  }
`;

type ProductDescriptionProps = {
  slug: string;
};

export function useProductDescription({ slug }: ProductDescriptionProps) {
  const { data, loading, error, refetch } = useQuery(TempProductBySlugOnProductDescriptionDocument, {
    variables: { slug },
  });
  return {
    description: data?.tempProductBySlug?.description,
    loading,
    error,
    refetch,
  };
}
