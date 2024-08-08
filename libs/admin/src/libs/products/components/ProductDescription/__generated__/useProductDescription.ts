import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductDescriptionQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductDescriptionQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', description?: string | null } | null };


export const TempProductBySlugOnProductDescriptionDocument = gql`
    query TempProductBySlugOnProductDescription($slug: String!) {
  tempProductBySlug(slug: $slug) {
    description
  }
}
    `;

/**
 * __useTempProductBySlugOnProductDescriptionQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductDescriptionQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductDescriptionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductDescriptionQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductDescriptionQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables> & ({ variables: TempProductBySlugOnProductDescriptionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>(TempProductBySlugOnProductDescriptionDocument, options);
      }
export function useTempProductBySlugOnProductDescriptionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>(TempProductBySlugOnProductDescriptionDocument, options);
        }
export function useTempProductBySlugOnProductDescriptionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>(TempProductBySlugOnProductDescriptionDocument, options);
        }
export type TempProductBySlugOnProductDescriptionQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductDescriptionQuery>;
export type TempProductBySlugOnProductDescriptionLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductDescriptionLazyQuery>;
export type TempProductBySlugOnProductDescriptionSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductDescriptionSuspenseQuery>;
export type TempProductBySlugOnProductDescriptionQueryResult = Apollo.QueryResult<TempProductBySlugOnProductDescriptionQuery, TempProductBySlugOnProductDescriptionQueryVariables>;