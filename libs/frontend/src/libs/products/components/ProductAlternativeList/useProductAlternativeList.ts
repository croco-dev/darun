import { gql } from '@apollo/client';
import { useLocale } from 'next-intl';
import { useProductWithFeaturesOnProductAlternativeListSuspenseQuery } from './__generated__/useProductAlternativeList';

gql`
  query ProductWithFeaturesOnProductAlternativeList($slug: String!, $locale: String!) {
    productBySlug(slug: $slug, locale: $locale) {
      id
      alternatives {
        id
        slug
        name
        logoUrl
        summary
        tags {
          id
          name
        }
        description
        features {
          emoji
          id
          name
          summary
        }
      }
    }
  }
`;

type ProductAlternativeListProps = {
  slug: string;
};

export const useProductAlternativeList = ({ slug }: ProductAlternativeListProps) => {
  const locale = useLocale();
  const { data } = useProductWithFeaturesOnProductAlternativeListSuspenseQuery({
    variables: { slug, locale },
  });
  return {
    products: data?.productBySlug?.alternatives,
  };
};
