import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductBySlugOnProductInfoQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductInfoQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, name: string, logoUrl: string } | null };


export const ProductBySlugOnProductInfoDocument = gql`
    query ProductBySlugOnProductInfo($slug: String!) {
  productBySlug(slug: $slug) {
    id
    name
    logoUrl
  }
}
    `;

/**
 * __useProductBySlugOnProductInfoQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductInfoQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductInfoQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables> & ({ variables: ProductBySlugOnProductInfoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>(ProductBySlugOnProductInfoDocument, options);
      }
export function useProductBySlugOnProductInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>(ProductBySlugOnProductInfoDocument, options);
        }
export function useProductBySlugOnProductInfoSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>(ProductBySlugOnProductInfoDocument, options);
        }
export type ProductBySlugOnProductInfoQueryHookResult = ReturnType<typeof useProductBySlugOnProductInfoQuery>;
export type ProductBySlugOnProductInfoLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductInfoLazyQuery>;
export type ProductBySlugOnProductInfoSuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductInfoSuspenseQuery>;
export type ProductBySlugOnProductInfoQueryResult = Apollo.QueryResult<ProductBySlugOnProductInfoQuery, ProductBySlugOnProductInfoQueryVariables>;