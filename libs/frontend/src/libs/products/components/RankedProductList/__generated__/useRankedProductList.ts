import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type RankedProductsOnRankedProductListQueryVariables = Types.Exact<{
  locale: Types.Scalars['String']['input'];
}>;


export type RankedProductsOnRankedProductListQuery = { __typename?: 'Query', rankedProducts: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const RankedProductsOnRankedProductListDocument = gql`
    query RankedProductsOnRankedProductList($locale: String!) {
  rankedProducts(first: 30, locale: $locale) {
    id
    name
    slug
    logoUrl
    summary
    voteCount
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useRankedProductsOnRankedProductListQuery__
 *
 * To run a query within a React component, call `useRankedProductsOnRankedProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useRankedProductsOnRankedProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRankedProductsOnRankedProductListQuery({
 *   variables: {
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useRankedProductsOnRankedProductListQuery(baseOptions: Apollo.QueryHookOptions<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables> & ({ variables: RankedProductsOnRankedProductListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>(RankedProductsOnRankedProductListDocument, options);
      }
export function useRankedProductsOnRankedProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>(RankedProductsOnRankedProductListDocument, options);
        }
export function useRankedProductsOnRankedProductListSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>(RankedProductsOnRankedProductListDocument, options);
        }
export type RankedProductsOnRankedProductListQueryHookResult = ReturnType<typeof useRankedProductsOnRankedProductListQuery>;
export type RankedProductsOnRankedProductListLazyQueryHookResult = ReturnType<typeof useRankedProductsOnRankedProductListLazyQuery>;
export type RankedProductsOnRankedProductListSuspenseQueryHookResult = ReturnType<typeof useRankedProductsOnRankedProductListSuspenseQuery>;
export type RankedProductsOnRankedProductListQueryResult = Apollo.QueryResult<RankedProductsOnRankedProductListQuery, RankedProductsOnRankedProductListQueryVariables>;