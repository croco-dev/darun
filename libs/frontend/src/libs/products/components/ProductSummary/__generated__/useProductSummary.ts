import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductBySlugOnProductSummaryQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductSummaryQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, name: string, summary: string, description?: string | null, logoUrl: string } | null };


export const ProductBySlugOnProductSummaryDocument = gql`
    query ProductBySlugOnProductSummary($slug: String!) {
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
 * __useProductBySlugOnProductSummaryQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductSummaryQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductSummaryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductSummaryQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductSummaryQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables> & ({ variables: ProductBySlugOnProductSummaryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>(ProductBySlugOnProductSummaryDocument, options);
      }
export function useProductBySlugOnProductSummaryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>(ProductBySlugOnProductSummaryDocument, options);
        }
export function useProductBySlugOnProductSummarySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>(ProductBySlugOnProductSummaryDocument, options);
        }
export type ProductBySlugOnProductSummaryQueryHookResult = ReturnType<typeof useProductBySlugOnProductSummaryQuery>;
export type ProductBySlugOnProductSummaryLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductSummaryLazyQuery>;
export type ProductBySlugOnProductSummarySuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductSummarySuspenseQuery>;
export type ProductBySlugOnProductSummaryQueryResult = Apollo.QueryResult<ProductBySlugOnProductSummaryQuery, ProductBySlugOnProductSummaryQueryVariables>;