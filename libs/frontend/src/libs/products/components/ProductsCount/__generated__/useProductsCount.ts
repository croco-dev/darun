import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductsCountOnProductsCountQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type ProductsCountOnProductsCountQuery = { __typename?: 'Query', productsCount: number };


export const ProductsCountOnProductsCountDocument = gql`
    query ProductsCountOnProductsCount {
  productsCount
}
    `;

/**
 * __useProductsCountOnProductsCountQuery__
 *
 * To run a query within a React component, call `useProductsCountOnProductsCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductsCountOnProductsCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductsCountOnProductsCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useProductsCountOnProductsCountQuery(baseOptions?: Apollo.QueryHookOptions<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>(ProductsCountOnProductsCountDocument, options);
      }
export function useProductsCountOnProductsCountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>(ProductsCountOnProductsCountDocument, options);
        }
export function useProductsCountOnProductsCountSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>(ProductsCountOnProductsCountDocument, options);
        }
export type ProductsCountOnProductsCountQueryHookResult = ReturnType<typeof useProductsCountOnProductsCountQuery>;
export type ProductsCountOnProductsCountLazyQueryHookResult = ReturnType<typeof useProductsCountOnProductsCountLazyQuery>;
export type ProductsCountOnProductsCountSuspenseQueryHookResult = ReturnType<typeof useProductsCountOnProductsCountSuspenseQuery>;
export type ProductsCountOnProductsCountQueryResult = Apollo.QueryResult<ProductsCountOnProductsCountQuery, ProductsCountOnProductsCountQueryVariables>;