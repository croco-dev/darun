import { gql } from '@apollo/client';
import { useApolloClient, useSuspenseQuery } from '@apollo/client/react';
import { ProductWithFeaturesOnProductAlternativeListDocument } from '@darun/provider-graphql';
import { useLocale } from 'next-intl';

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
  alternativeIds?: string[];
};

export const useProductAlternativeList = ({ slug, alternativeIds }: ProductAlternativeListProps) => {
  const locale = useLocale();
  const client = useApolloClient();
  const variables = { slug, locale };
  const cachedAlternatives = alternativeIds
    ? client.readQuery({ query: ProductWithFeaturesOnProductAlternativeListDocument, variables })?.productBySlug
        ?.alternatives
    : undefined;
  // The route already reads the current ordering for metadata. Discard the cached
  // membership only when that read and the browser's feature-inclusive result disagree.
  const membershipChanged =
    alternativeIds &&
    cachedAlternatives &&
    (alternativeIds.length !== cachedAlternatives.length ||
      alternativeIds.some((id, index) => id !== cachedAlternatives[index].id));
  const { data } = useSuspenseQuery(ProductWithFeaturesOnProductAlternativeListDocument, {
    variables,
    queryKey: alternativeIds,
    fetchPolicy: membershipChanged ? 'network-only' : 'cache-first',
  });
  return {
    products: data?.productBySlug?.alternatives,
    locale,
  };
};
