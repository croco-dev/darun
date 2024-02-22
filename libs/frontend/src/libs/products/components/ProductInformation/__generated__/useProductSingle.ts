import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductBySlugOnProductSingleQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductSingleQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, name: string, summary: string, description?: string | null, logoUrl: string } | null };


export const ProductBySlugOnProductSingleDocument = gql`
    query ProductBySlugOnProductSingle($slug: String!) {
  productBySlug(slug: $slug) {
    id
    name
    summary
    description
    logoUrl
  }
}
    `;

/**
 * __useProductBySlugOnProductSingleQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductSingleQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductSingleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductSingleQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductSingleQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables> & ({ variables: ProductBySlugOnProductSingleQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>(ProductBySlugOnProductSingleDocument, options);
      }
export function useProductBySlugOnProductSingleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>(ProductBySlugOnProductSingleDocument, options);
        }
export function useProductBySlugOnProductSingleSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>(ProductBySlugOnProductSingleDocument, options);
        }
export type ProductBySlugOnProductSingleQueryHookResult = ReturnType<typeof useProductBySlugOnProductSingleQuery>;
export type ProductBySlugOnProductSingleLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductSingleLazyQuery>;
export type ProductBySlugOnProductSingleSuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductSingleSuspenseQuery>;
export type ProductBySlugOnProductSingleQueryResult = Apollo.QueryResult<ProductBySlugOnProductSingleQuery, ProductBySlugOnProductSingleQueryVariables>;