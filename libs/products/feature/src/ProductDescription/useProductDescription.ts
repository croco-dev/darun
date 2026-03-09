import { gql } from '@apollo/client';
import { useTempProductBySlugOnProductDescriptionSuspenseQuery } from './__generated__/useProductDescription';

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
  const { data } = useTempProductBySlugOnProductDescriptionSuspenseQuery({
    variables: { slug },
  });
  return { description: data?.tempProductBySlug?.description };
}
