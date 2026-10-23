import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { TempProductBySlugOnProductFeatureTableDocument } from '@darun/provider-graphql';
import type { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query TempProductBySlugOnProductFeatureTable($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      features {
        id
        name
        emoji
        summary
      }
    }
  }
`;

type ProductFeatureTableProps = {
  slug: string;
  editFeature: (id: string) => void;
  translationAction?: (id: string) => ReactNode;
};

export function useProductFeatureTable({ slug, editFeature, translationAction }: ProductFeatureTableProps) {
  const { data, loading, error, refetch } = useQuery(TempProductBySlugOnProductFeatureTableDocument, {
    variables: { slug },
  });
  return { features: data?.tempProductBySlug?.features, loading, error, editFeature, refetch, translationAction };
}
