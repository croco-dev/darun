import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CategoriesForEmptyStateQueryVariables = Types.Exact<{
  first: Types.Scalars['Int']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type CategoriesForEmptyStateQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, slug: string, labelKo: string, labelEn: string }> };


export const CategoriesForEmptyStateDocument = gql`
    query CategoriesForEmptyState($first: Int!, $locale: String!) {
  categories(first: $first, locale: $locale) {
    id
    slug
    labelKo
    labelEn
  }
}
    `;

/**
 * __useCategoriesForEmptyStateQuery__
 *
 * To run a query within a React component, call `useCategoriesForEmptyStateQuery` and pass it any options that fit your needs.
 * When your component renders, `useCategoriesForEmptyStateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCategoriesForEmptyStateQuery({
 *   variables: {
 *      first: // value for 'first'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useCategoriesForEmptyStateQuery(baseOptions: Apollo.QueryHookOptions<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables> & ({ variables: CategoriesForEmptyStateQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>(CategoriesForEmptyStateDocument, options);
      }
export function useCategoriesForEmptyStateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>(CategoriesForEmptyStateDocument, options);
        }
export function useCategoriesForEmptyStateSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>(CategoriesForEmptyStateDocument, options);
        }
export type CategoriesForEmptyStateQueryHookResult = ReturnType<typeof useCategoriesForEmptyStateQuery>;
export type CategoriesForEmptyStateLazyQueryHookResult = ReturnType<typeof useCategoriesForEmptyStateLazyQuery>;
export type CategoriesForEmptyStateSuspenseQueryHookResult = ReturnType<typeof useCategoriesForEmptyStateSuspenseQuery>;
export type CategoriesForEmptyStateQueryResult = Apollo.QueryResult<CategoriesForEmptyStateQuery, CategoriesForEmptyStateQueryVariables>;