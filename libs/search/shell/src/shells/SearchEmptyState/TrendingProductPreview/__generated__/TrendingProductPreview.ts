import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TrendingPreviewQueryVariables = Types.Exact<{
  first: Types.Scalars['Int']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type TrendingPreviewQuery = { __typename?: 'Query', rankedProducts: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const TrendingPreviewDocument = gql`
    query TrendingPreview($first: Int!, $locale: String!) {
  rankedProducts(first: $first, locale: $locale) {
    id
    name
    slug
    logoUrl
    summary
    voteCount
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useTrendingPreviewQuery__
 *
 * To run a query within a React component, call `useTrendingPreviewQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrendingPreviewQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrendingPreviewQuery({
 *   variables: {
 *      first: // value for 'first'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useTrendingPreviewQuery(baseOptions: Apollo.QueryHookOptions<TrendingPreviewQuery, TrendingPreviewQueryVariables> & ({ variables: TrendingPreviewQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrendingPreviewQuery, TrendingPreviewQueryVariables>(TrendingPreviewDocument, options);
      }
export function useTrendingPreviewLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrendingPreviewQuery, TrendingPreviewQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrendingPreviewQuery, TrendingPreviewQueryVariables>(TrendingPreviewDocument, options);
        }
export function useTrendingPreviewSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrendingPreviewQuery, TrendingPreviewQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrendingPreviewQuery, TrendingPreviewQueryVariables>(TrendingPreviewDocument, options);
        }
export type TrendingPreviewQueryHookResult = ReturnType<typeof useTrendingPreviewQuery>;
export type TrendingPreviewLazyQueryHookResult = ReturnType<typeof useTrendingPreviewLazyQuery>;
export type TrendingPreviewSuspenseQueryHookResult = ReturnType<typeof useTrendingPreviewSuspenseQuery>;
export type TrendingPreviewQueryResult = Apollo.QueryResult<TrendingPreviewQuery, TrendingPreviewQueryVariables>;