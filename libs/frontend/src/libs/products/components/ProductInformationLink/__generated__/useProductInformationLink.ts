import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductOnProductInformationLinkQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductOnProductInformationLinkQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, links: Array<{ __typename?: 'Link', id: string, displayLink: string, link: string, title: string, iconUrl: string }> } | null };


export const ProductOnProductInformationLinkDocument = gql`
    query ProductOnProductInformationLink($slug: String!) {
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
 * __useProductOnProductInformationLinkQuery__
 *
 * To run a query within a React component, call `useProductOnProductInformationLinkQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductOnProductInformationLinkQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductOnProductInformationLinkQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductOnProductInformationLinkQuery(baseOptions: Apollo.QueryHookOptions<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables> & ({ variables: ProductOnProductInformationLinkQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>(ProductOnProductInformationLinkDocument, options);
      }
export function useProductOnProductInformationLinkLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>(ProductOnProductInformationLinkDocument, options);
        }
export function useProductOnProductInformationLinkSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>(ProductOnProductInformationLinkDocument, options);
        }
export type ProductOnProductInformationLinkQueryHookResult = ReturnType<typeof useProductOnProductInformationLinkQuery>;
export type ProductOnProductInformationLinkLazyQueryHookResult = ReturnType<typeof useProductOnProductInformationLinkLazyQuery>;
export type ProductOnProductInformationLinkSuspenseQueryHookResult = ReturnType<typeof useProductOnProductInformationLinkSuspenseQuery>;
export type ProductOnProductInformationLinkQueryResult = Apollo.QueryResult<ProductOnProductInformationLinkQuery, ProductOnProductInformationLinkQueryVariables>;