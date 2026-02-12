import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductBySlugOnAlternativeProductListSuspenseQuery } from './__generated__/useAlternativeProductList';

gql`
  query ProductBySlugOnAlternativeProductList($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      alternatives {
        id
        name
        slug
        summary
        logoUrl
        tags {
          id
          name
        }
      }
    }
  }
`;

type AlternativeProductListProps = {
  slug: string;
};
export function useAlternativeProductList({ slug }: AlternativeProductListProps) {
  const locale = useLocale();
  const { data } = useProductBySlugOnAlternativeProductListSuspenseQuery({
    variables: { slug, locale },
  });

  return {
    alternatives: data?.productBySlug?.alternatives ?? [],
  };
}
