import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductInfoQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductInfoQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string } | null };


export const TempProductBySlugOnProductInfoDocument = gql`
    query TempProductBySlugOnProductInfo($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    name
    slug
    logoUrl
  }
}
    `;

/**
 * __useTempProductBySlugOnProductInfoQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductInfoQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductInfoQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables> & ({ variables: TempProductBySlugOnProductInfoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>(TempProductBySlugOnProductInfoDocument, options);
      }
export function useTempProductBySlugOnProductInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>(TempProductBySlugOnProductInfoDocument, options);
        }
export function useTempProductBySlugOnProductInfoSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>(TempProductBySlugOnProductInfoDocument, options);
        }
export type TempProductBySlugOnProductInfoQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductInfoQuery>;
export type TempProductBySlugOnProductInfoLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductInfoLazyQuery>;
export type TempProductBySlugOnProductInfoSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductInfoSuspenseQuery>;
export type TempProductBySlugOnProductInfoQueryResult = Apollo.QueryResult<TempProductBySlugOnProductInfoQuery, TempProductBySlugOnProductInfoQueryVariables>;