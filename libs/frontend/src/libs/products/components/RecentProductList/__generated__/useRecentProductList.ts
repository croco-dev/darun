import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type RecentProductsOnRecentProductListQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type RecentProductsOnRecentProductListQuery = { __typename?: 'Query', recentProducts: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const RecentProductsOnRecentProductListDocument = gql`
    query RecentProductsOnRecentProductList {
  recentProducts {
    id
    name
    slug
    logoUrl
    summary
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useRecentProductsOnRecentProductListQuery__
 *
 * To run a query within a React component, call `useRecentProductsOnRecentProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecentProductsOnRecentProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecentProductsOnRecentProductListQuery({
 *   variables: {
 *   },
 * });
 */
export function useRecentProductsOnRecentProductListQuery(baseOptions?: Apollo.QueryHookOptions<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>(RecentProductsOnRecentProductListDocument, options);
      }
export function useRecentProductsOnRecentProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>(RecentProductsOnRecentProductListDocument, options);
        }
export function useRecentProductsOnRecentProductListSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>(RecentProductsOnRecentProductListDocument, options);
        }
export type RecentProductsOnRecentProductListQueryHookResult = ReturnType<typeof useRecentProductsOnRecentProductListQuery>;
export type RecentProductsOnRecentProductListLazyQueryHookResult = ReturnType<typeof useRecentProductsOnRecentProductListLazyQuery>;
export type RecentProductsOnRecentProductListSuspenseQueryHookResult = ReturnType<typeof useRecentProductsOnRecentProductListSuspenseQuery>;
export type RecentProductsOnRecentProductListQueryResult = Apollo.QueryResult<RecentProductsOnRecentProductListQuery, RecentProductsOnRecentProductListQueryVariables>;