import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductLinkTableQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductLinkTableQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, links: Array<{ __typename?: 'Link', id: string, title: string, link: string, displayLink: string, iconUrl: string, isPrimary: boolean }> } | null };


export const TempProductBySlugOnProductLinkTableDocument = gql`
    query TempProductBySlugOnProductLinkTable($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    links {
      id
      title
      link
      displayLink
      iconUrl
      isPrimary
    }
  }
}
    `;

/**
 * __useTempProductBySlugOnProductLinkTableQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductLinkTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductLinkTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductLinkTableQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductLinkTableQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables> & ({ variables: TempProductBySlugOnProductLinkTableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>(TempProductBySlugOnProductLinkTableDocument, options);
      }
export function useTempProductBySlugOnProductLinkTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>(TempProductBySlugOnProductLinkTableDocument, options);
        }
export function useTempProductBySlugOnProductLinkTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>(TempProductBySlugOnProductLinkTableDocument, options);
        }
export type TempProductBySlugOnProductLinkTableQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductLinkTableQuery>;
export type TempProductBySlugOnProductLinkTableLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductLinkTableLazyQuery>;
export type TempProductBySlugOnProductLinkTableSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductLinkTableSuspenseQuery>;
export type TempProductBySlugOnProductLinkTableQueryResult = Apollo.QueryResult<TempProductBySlugOnProductLinkTableQuery, TempProductBySlugOnProductLinkTableQueryVariables>;