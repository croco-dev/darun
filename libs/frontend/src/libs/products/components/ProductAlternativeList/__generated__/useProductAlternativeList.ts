import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductWithFeaturesOnProductAlternativeListQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductWithFeaturesOnProductAlternativeListQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, alternatives: Array<{ __typename?: 'Product', id: string, slug: string, name: string, logoUrl: string, summary: string, description?: string | null, tags: Array<{ __typename?: 'Tag', id: string, name: string }>, features: Array<{ __typename?: 'Feature', emoji: string, id: string, name: string, summary?: string | null }> }> } | null };


export const ProductWithFeaturesOnProductAlternativeListDocument = gql`
    query ProductWithFeaturesOnProductAlternativeList($slug: String!) {
  productBySlug(slug: $slug) {
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

/**
 * __useProductWithFeaturesOnProductAlternativeListQuery__
 *
 * To run a query within a React component, call `useProductWithFeaturesOnProductAlternativeListQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductWithFeaturesOnProductAlternativeListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductWithFeaturesOnProductAlternativeListQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductWithFeaturesOnProductAlternativeListQuery(baseOptions: Apollo.QueryHookOptions<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables> & ({ variables: ProductWithFeaturesOnProductAlternativeListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>(ProductWithFeaturesOnProductAlternativeListDocument, options);
      }
export function useProductWithFeaturesOnProductAlternativeListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>(ProductWithFeaturesOnProductAlternativeListDocument, options);
        }
export function useProductWithFeaturesOnProductAlternativeListSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>(ProductWithFeaturesOnProductAlternativeListDocument, options);
        }
export type ProductWithFeaturesOnProductAlternativeListQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductAlternativeListQuery>;
export type ProductWithFeaturesOnProductAlternativeListLazyQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductAlternativeListLazyQuery>;
export type ProductWithFeaturesOnProductAlternativeListSuspenseQueryHookResult = ReturnType<typeof useProductWithFeaturesOnProductAlternativeListSuspenseQuery>;
export type ProductWithFeaturesOnProductAlternativeListQueryResult = Apollo.QueryResult<ProductWithFeaturesOnProductAlternativeListQuery, ProductWithFeaturesOnProductAlternativeListQueryVariables>;