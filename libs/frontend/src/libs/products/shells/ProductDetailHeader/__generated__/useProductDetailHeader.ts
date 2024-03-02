import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductOnProductDetailHeaderQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductOnProductDetailHeaderQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, links: Array<{ __typename?: 'Link', id: string, displayLink: string, link: string, title: string, iconUrl: string }> } | null };


export const ProductOnProductDetailHeaderDocument = gql`
    query ProductOnProductDetailHeader($slug: String!) {
  productBySlug(slug: $slug) {
    id
    links {
      id
      displayLink
      link
      title
      iconUrl
    }
  }
}
    `;

/**
 * __useProductOnProductDetailHeaderQuery__
 *
 * To run a query within a React component, call `useProductOnProductDetailHeaderQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductOnProductDetailHeaderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductOnProductDetailHeaderQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductOnProductDetailHeaderQuery(baseOptions: Apollo.QueryHookOptions<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables> & ({ variables: ProductOnProductDetailHeaderQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>(ProductOnProductDetailHeaderDocument, options);
      }
export function useProductOnProductDetailHeaderLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>(ProductOnProductDetailHeaderDocument, options);
        }
export function useProductOnProductDetailHeaderSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>(ProductOnProductDetailHeaderDocument, options);
        }
export type ProductOnProductDetailHeaderQueryHookResult = ReturnType<typeof useProductOnProductDetailHeaderQuery>;
export type ProductOnProductDetailHeaderLazyQueryHookResult = ReturnType<typeof useProductOnProductDetailHeaderLazyQuery>;
export type ProductOnProductDetailHeaderSuspenseQueryHookResult = ReturnType<typeof useProductOnProductDetailHeaderSuspenseQuery>;
export type ProductOnProductDetailHeaderQueryResult = Apollo.QueryResult<ProductOnProductDetailHeaderQuery, ProductOnProductDetailHeaderQueryVariables>;