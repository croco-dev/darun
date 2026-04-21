import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductFeatureTableQuery } from './__generated__/useProductFeatureTable';

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
  const { data, loading } = useTempProductBySlugOnProductFeatureTableQuery({
    variables: { slug },
  });
  return { features: data?.tempProductBySlug?.features, loading, editFeature };
}
