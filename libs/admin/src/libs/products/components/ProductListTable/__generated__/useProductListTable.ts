import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AllProductsOnProductListTableQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type AllProductsOnProductListTableQuery = { __typename?: 'Query', allProducts: { __typename?: 'ProductConnection', edges: Array<{ __typename?: 'ProductEdge', cursor: string, node: { __typename?: 'Product', id: string, slug: string, name: string, summary: string } }> } };


export const AllProductsOnProductListTableDocument = gql`
    query AllProductsOnProductListTable {
  allProducts(first: 50) {
    edges {
      cursor
      node {
        id
        slug
        name
        summary
      }
    }
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