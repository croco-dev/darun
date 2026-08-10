import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TrendingProductsOnTrendingProductSectionQueryVariables = Types.Exact<{
  locale: Types.Scalars['String']['input'];
}>;


export type TrendingProductsOnTrendingProductSectionQuery = { __typename?: 'Query', rankedProducts: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const TrendingProductsOnTrendingProductSectionDocument = gql`
    query TrendingProductsOnTrendingProductSection($locale: String!) {
  rankedProducts(first: 8, locale: $locale) {
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
 * __useTrendingProductsOnTrendingProductSectionQuery__
 *
 * To run a query within a React component, call `useTrendingProductsOnTrendingProductSectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrendingProductsOnTrendingProductSectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrendingProductsOnTrendingProductSectionQuery({
 *   variables: {
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useTrendingProductsOnTrendingProductSectionQuery(baseOptions: Apollo.QueryHookOptions<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables> & ({ variables: TrendingProductsOnTrendingProductSectionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>(TrendingProductsOnTrendingProductSectionDocument, options);
      }
export function useTrendingProductsOnTrendingProductSectionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>(TrendingProductsOnTrendingProductSectionDocument, options);
        }
export function useTrendingProductsOnTrendingProductSectionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>(TrendingProductsOnTrendingProductSectionDocument, options);
        }
export type TrendingProductsOnTrendingProductSectionQueryHookResult = ReturnType<typeof useTrendingProductsOnTrendingProductSectionQuery>;
export type TrendingProductsOnTrendingProductSectionLazyQueryHookResult = ReturnType<typeof useTrendingProductsOnTrendingProductSectionLazyQuery>;
export type TrendingProductsOnTrendingProductSectionSuspenseQueryHookResult = ReturnType<typeof useTrendingProductsOnTrendingProductSectionSuspenseQuery>;
export type TrendingProductsOnTrendingProductSectionQueryResult = Apollo.QueryResult<TrendingProductsOnTrendingProductSectionQuery, TrendingProductsOnTrendingProductSectionQueryVariables>;