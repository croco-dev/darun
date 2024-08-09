import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductDescriptionSuspenseQuery } from './__generated__/useProductDescription';

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
  const { data } = useTempProductBySlugOnProductDescriptionSuspenseQuery({ variables: { slug } });
  return { description: data.tempProductBySlug?.description };
}
