import { gql } from '@apollo/client';
import { TempProductBySlugOnProductDescriptionDocument } from '@darun/provider-graphql';
import { useSavedProductDescription } from './useSavedProductDescription';

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
  const { data, loading, error, refetch } = useSavedProductDescription(
    TempProductBySlugOnProductDescriptionDocument,
    slug
  );
  return {
    description: data?.tempProductBySlug?.description,
    loading,
    error,
    refetch,
  };
}
