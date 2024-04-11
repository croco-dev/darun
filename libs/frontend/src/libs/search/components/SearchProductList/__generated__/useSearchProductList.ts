import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type SearchProductsOnSearchProductListQueryVariables = Types.Exact<{
  query: Types.Scalars['String']['input'];
}>;


export type SearchProductsOnSearchProductListQuery = { __typename?: 'Query', searchProducts: Array<{ __typename?: 'Product', id: string, slug: string, name: string, logoUrl: string, summary: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }>, features: Array<{ __typename?: 'Feature', emoji: string, id: string, name: string, summary?: string | null }> }> };


export const SearchProductsOnSearchProductListDocument = gql`
    query SearchProductsOnSearchProductList($query: String!) {
  searchProducts(query: $query) {
    id
    slug
    name
    logoUrl
    summary
    tags {
      id
      name
    }
    features {
      emoji
      id
      name
      summary
    }
  }
}
    `;

/**
 * __useSearchProductsOnSearchProductListQuery__
 *
 * To run a query within a React component, call `useSearchProductsOnSearchProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchProductsOnSearchProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchProductsOnSearchProductListQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useSearchProductsOnSearchProductListQuery(baseOptions: Apollo.QueryHookOptions<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables> & ({ variables: SearchProductsOnSearchProductListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>(SearchProductsOnSearchProductListDocument, options);
      }
export function useSearchProductsOnSearchProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>(SearchProductsOnSearchProductListDocument, options);
        }
export function useSearchProductsOnSearchProductListSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>(SearchProductsOnSearchProductListDocument, options);
        }
export type SearchProductsOnSearchProductListQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductListQuery>;
export type SearchProductsOnSearchProductListLazyQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductListLazyQuery>;
export type SearchProductsOnSearchProductListSuspenseQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductListSuspenseQuery>;
export type SearchProductsOnSearchProductListQueryResult = Apollo.QueryResult<SearchProductsOnSearchProductListQuery, SearchProductsOnSearchProductListQueryVariables>;