import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CompactCategoriesForSearchProductListQueryVariables = Types.Exact<{
  first: Types.Scalars['Int']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type CompactCategoriesForSearchProductListQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, slug: string, labelKo: string, labelEn: string }> };

export type CompactTrendingPreviewForSearchProductListQueryVariables = Types.Exact<{
  first: Types.Scalars['Int']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type CompactTrendingPreviewForSearchProductListQuery = { __typename?: 'Query', rankedProducts: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const CompactCategoriesForSearchProductListDocument = gql`
    query CompactCategoriesForSearchProductList($first: Int!, $locale: String!) {
  categories(first: $first, locale: $locale) {
    id
    slug
    labelKo
    labelEn
  }
}
    `;

/**
 * __useCompactCategoriesForSearchProductListQuery__
 *
 * To run a query within a React component, call `useCompactCategoriesForSearchProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompactCategoriesForSearchProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompactCategoriesForSearchProductListQuery({
 *   variables: {
 *      first: // value for 'first'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useCompactCategoriesForSearchProductListQuery(baseOptions: Apollo.QueryHookOptions<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables> & ({ variables: CompactCategoriesForSearchProductListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>(CompactCategoriesForSearchProductListDocument, options);
      }
export function useCompactCategoriesForSearchProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>(CompactCategoriesForSearchProductListDocument, options);
        }
export function useCompactCategoriesForSearchProductListSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>(CompactCategoriesForSearchProductListDocument, options);
        }
export type CompactCategoriesForSearchProductListQueryHookResult = ReturnType<typeof useCompactCategoriesForSearchProductListQuery>;
export type CompactCategoriesForSearchProductListLazyQueryHookResult = ReturnType<typeof useCompactCategoriesForSearchProductListLazyQuery>;
export type CompactCategoriesForSearchProductListSuspenseQueryHookResult = ReturnType<typeof useCompactCategoriesForSearchProductListSuspenseQuery>;
export type CompactCategoriesForSearchProductListQueryResult = Apollo.QueryResult<CompactCategoriesForSearchProductListQuery, CompactCategoriesForSearchProductListQueryVariables>;
export const CompactTrendingPreviewForSearchProductListDocument = gql`
    query CompactTrendingPreviewForSearchProductList($first: Int!, $locale: String!) {
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
 * __useCompactTrendingPreviewForSearchProductListQuery__
 *
 * To run a query within a React component, call `useCompactTrendingPreviewForSearchProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompactTrendingPreviewForSearchProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompactTrendingPreviewForSearchProductListQuery({
 *   variables: {
 *      first: // value for 'first'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useCompactTrendingPreviewForSearchProductListQuery(baseOptions: Apollo.QueryHookOptions<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables> & ({ variables: CompactTrendingPreviewForSearchProductListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>(CompactTrendingPreviewForSearchProductListDocument, options);
      }
export function useCompactTrendingPreviewForSearchProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>(CompactTrendingPreviewForSearchProductListDocument, options);
        }
export function useCompactTrendingPreviewForSearchProductListSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>(CompactTrendingPreviewForSearchProductListDocument, options);
        }
export type CompactTrendingPreviewForSearchProductListQueryHookResult = ReturnType<typeof useCompactTrendingPreviewForSearchProductListQuery>;
export type CompactTrendingPreviewForSearchProductListLazyQueryHookResult = ReturnType<typeof useCompactTrendingPreviewForSearchProductListLazyQuery>;
export type CompactTrendingPreviewForSearchProductListSuspenseQueryHookResult = ReturnType<typeof useCompactTrendingPreviewForSearchProductListSuspenseQuery>;
export type CompactTrendingPreviewForSearchProductListQueryResult = Apollo.QueryResult<CompactTrendingPreviewForSearchProductListQuery, CompactTrendingPreviewForSearchProductListQueryVariables>;