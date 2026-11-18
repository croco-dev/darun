import { gql } from '@apollo/client';
import { TempProductBySlugOnProductDescriptionDocument } from '@darun/provider-graphql';
import { useSavedProductDescription } from './useSavedProductDescription';

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
  const { data, loading, error, refetch, verificationError, verificationPending } = useSavedProductDescription(
    TempProductBySlugOnProductDescriptionDocument,
    slug
  );
  return {
    description: data?.tempProductBySlug?.description,
    loading,
    error,
    refetch,
    verificationError,
    verificationPending,
  };
}
