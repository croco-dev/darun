import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type SearchProductsOnSearchProductFieldQueryVariables = Types.Exact<{
  query: Types.Scalars['String']['input'];
}>;


export type SearchProductsOnSearchProductFieldQuery = { __typename?: 'Query', searchProducts: Array<{ __typename?: 'Product', id: string, name: string }> };


export const SearchProductsOnSearchProductFieldDocument = gql`
    query SearchProductsOnSearchProductField($query: String!) {
  searchProducts(query: $query) {
    id
    name
  }
}
    `;

/**
 * __useSearchProductsOnSearchProductFieldQuery__
 *
 * To run a query within a React component, call `useSearchProductsOnSearchProductFieldQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchProductsOnSearchProductFieldQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchProductsOnSearchProductFieldQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useSearchProductsOnSearchProductFieldQuery(baseOptions: Apollo.QueryHookOptions<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables> & ({ variables: SearchProductsOnSearchProductFieldQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>(SearchProductsOnSearchProductFieldDocument, options);
      }
export function useSearchProductsOnSearchProductFieldLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>(SearchProductsOnSearchProductFieldDocument, options);
        }
export function useSearchProductsOnSearchProductFieldSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>(SearchProductsOnSearchProductFieldDocument, options);
        }
export type SearchProductsOnSearchProductFieldQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductFieldQuery>;
export type SearchProductsOnSearchProductFieldLazyQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductFieldLazyQuery>;
export type SearchProductsOnSearchProductFieldSuspenseQueryHookResult = ReturnType<typeof useSearchProductsOnSearchProductFieldSuspenseQuery>;
export type SearchProductsOnSearchProductFieldQueryResult = Apollo.QueryResult<SearchProductsOnSearchProductFieldQuery, SearchProductsOnSearchProductFieldQueryVariables>;