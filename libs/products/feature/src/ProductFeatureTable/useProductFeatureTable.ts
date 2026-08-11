import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { TempProductBySlugOnProductFeatureTableDocument } from '@darun/provider-graphql';

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
};

export function useProductFeatureTable({ slug, editFeature }: ProductFeatureTableProps) {
  const { data, loading } = useQuery(TempProductBySlugOnProductFeatureTableDocument, {
    variables: { slug },
  });
  return { features: data?.tempProductBySlug?.features, loading, editFeature };
}
