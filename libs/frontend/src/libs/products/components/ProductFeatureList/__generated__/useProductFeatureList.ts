import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductWithFeaturesOnProductFeatureListQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductWithFeaturesOnProductFeatureListQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, features: Array<{ __typename?: 'Feature', id: string, name: string, emoji: string, summary?: string | null, screenshots: Array<{ __typename?: 'FeatureScreenshot', id: string, imageAlt: string, imageUrl: string }> }> } | null };


export const ProductWithFeaturesOnProductFeatureListDocument = gql`
    query ProductWithFeaturesOnProductFeatureList($slug: String!) {
  productBySlug(slug: $slug) {
    id
    features {
      id
      name
      emoji
      summary
      screenshots {
        id
        imageAlt
        imageUrl
      }
    }
  }
}
    `;

/**
 * __useProductWithFeaturesOnProductFeatureListQuery__
 *
 * To run a query within a React component, call `useProductWithFeaturesOnProductFeatureListQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductWithFeaturesOnProductFeatureListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductWithFeaturesOnProductFeatureListQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductWithFeaturesOnProductFeatureListQuery(baseOptions: Apollo.QueryHookOptions<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables> & ({ variables: ProductWithFeaturesOnProductFeatureListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>(ProductWithFeaturesOnProductFeatureListDocument, options);
      }
export function useProductWithFeaturesOnProductFeatureListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>(ProductWithFeaturesOnProductFeatureListDocument, options);
        }
export function useProductWithFeaturesOnProductFeatureListSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>(ProductWithFeaturesOnProductFeatureListDocument, options);
        }
export type ProductWithFeaturesOnProductFeatureListQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductFeatureListQuery>;
export type ProductWithFeaturesOnProductFeatureListLazyQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductFeatureListLazyQuery>;
export type ProductWithFeaturesOnProductFeatureListSuspenseQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductFeatureListSuspenseQuery>;
export type ProductWithFeaturesOnProductFeatureListQueryResult = Apollo.QueryResult<ProductWithFeaturesOnProductFeatureListQuery, ProductWithFeaturesOnProductFeatureListQueryVariables>;