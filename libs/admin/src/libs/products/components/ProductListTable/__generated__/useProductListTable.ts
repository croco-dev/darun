import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AllProductsOnProductListTableQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  after?: Types.InputMaybe<Types.Scalars['String']['input']>;
  last?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  before?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type AllProductsOnProductListTableQuery = { __typename?: 'Query', allProducts: { __typename?: 'ProductConnection', totalCount: number, edges: Array<{ __typename?: 'ProductEdge', cursor: string, node: { __typename?: 'Product', id: string, logoUrl: string, slug: string, name: string, summary: string } }>, pageInfo: { __typename?: 'PageInfo', endCursor?: string | null, hasNextPage: boolean, startCursor?: string | null, hasPreviousPage: boolean } } };


export const AllProductsOnProductListTableDocument = gql`
    query AllProductsOnProductListTable($first: Int, $after: String, $last: Int, $before: String) {
  allProducts(first: $first, after: $after, last: $last, before: $before) {
    edges {
      cursor
      node {
        id
        logoUrl
        slug
        name
        summary
      }
    }
    pageInfo {
      endCursor
      hasNextPage
      startCursor
      hasPreviousPage
    }
    totalCount
  }
}
    `;

/**
 * __useAllProductsOnProductListTableQuery__
 *
 * To run a query within a React component, call `useAllProductsOnProductListTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllProductsOnProductListTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllProductsOnProductListTableQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      last: // value for 'last'
 *      before: // value for 'before'
 *   },
 * });
 */
export function useAllProductsOnProductListTableQuery(baseOptions?: Apollo.QueryHookOptions<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>(AllProductsOnProductListTableDocument, options);
      }
export function useAllProductsOnProductListTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>(AllProductsOnProductListTableDocument, options);
        }
export function useAllProductsOnProductListTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>(AllProductsOnProductListTableDocument, options);
        }
export type AllProductsOnProductListTableQueryHookResult = ReturnType<typeof useAllProductsOnProductListTableQuery>;
export type AllProductsOnProductListTableLazyQueryHookResult = ReturnType<typeof useAllProductsOnProductListTableLazyQuery>;
export type AllProductsOnProductListTableSuspenseQueryHookResult = ReturnType<typeof useAllProductsOnProductListTableSuspenseQuery>;
export type AllProductsOnProductListTableQueryResult = Apollo.QueryResult<AllProductsOnProductListTableQuery, AllProductsOnProductListTableQueryVariables>;