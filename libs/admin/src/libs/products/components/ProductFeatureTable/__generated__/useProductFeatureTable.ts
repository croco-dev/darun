import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductFeatureTableQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductFeatureTableQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, features: Array<{ __typename?: 'Feature', id: string, name: string, emoji: string, summary?: string | null }> } | null };


export const TempProductBySlugOnProductFeatureTableDocument = gql`
    query TempProductBySlugOnProductFeatureTable($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    features {
      id
      name
      emoji
      summary
    }
  }
}
    `;

/**
 * __useTempProductBySlugOnProductFeatureTableQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductFeatureTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductFeatureTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductFeatureTableQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductFeatureTableQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables> & ({ variables: TempProductBySlugOnProductFeatureTableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>(TempProductBySlugOnProductFeatureTableDocument, options);
      }
export function useTempProductBySlugOnProductFeatureTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>(TempProductBySlugOnProductFeatureTableDocument, options);
        }
export function useTempProductBySlugOnProductFeatureTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>(TempProductBySlugOnProductFeatureTableDocument, options);
        }
export type TempProductBySlugOnProductFeatureTableQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductFeatureTableQuery>;
export type TempProductBySlugOnProductFeatureTableLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductFeatureTableLazyQuery>;
export type TempProductBySlugOnProductFeatureTableSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductFeatureTableSuspenseQuery>;
export type TempProductBySlugOnProductFeatureTableQueryResult = Apollo.QueryResult<TempProductBySlugOnProductFeatureTableQuery, TempProductBySlugOnProductFeatureTableQueryVariables>;