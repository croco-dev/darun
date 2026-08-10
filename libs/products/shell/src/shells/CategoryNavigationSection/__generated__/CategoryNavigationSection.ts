import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CategoriesOnCategoryNavigationSectionQueryVariables = Types.Exact<{
  first: Types.Scalars['Int']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type CategoriesOnCategoryNavigationSectionQuery = { __typename?: 'Query', categories: Array<{ __typename?: 'Category', id: string, slug: string, labelKo: string, labelEn: string }> };


export const CategoriesOnCategoryNavigationSectionDocument = gql`
    query CategoriesOnCategoryNavigationSection($first: Int!, $locale: String!) {
  categories(first: $first, locale: $locale) {
    id
    slug
    labelKo
    labelEn
  }
}
    `;

/**
 * __useCategoriesOnCategoryNavigationSectionQuery__
 *
 * To run a query within a React component, call `useCategoriesOnCategoryNavigationSectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useCategoriesOnCategoryNavigationSectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCategoriesOnCategoryNavigationSectionQuery({
 *   variables: {
 *      first: // value for 'first'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useCategoriesOnCategoryNavigationSectionQuery(baseOptions: Apollo.QueryHookOptions<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables> & ({ variables: CategoriesOnCategoryNavigationSectionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>(CategoriesOnCategoryNavigationSectionDocument, options);
      }
export function useCategoriesOnCategoryNavigationSectionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>(CategoriesOnCategoryNavigationSectionDocument, options);
        }
export function useCategoriesOnCategoryNavigationSectionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>(CategoriesOnCategoryNavigationSectionDocument, options);
        }
export type CategoriesOnCategoryNavigationSectionQueryHookResult = ReturnType<typeof useCategoriesOnCategoryNavigationSectionQuery>;
export type CategoriesOnCategoryNavigationSectionLazyQueryHookResult = ReturnType<typeof useCategoriesOnCategoryNavigationSectionLazyQuery>;
export type CategoriesOnCategoryNavigationSectionSuspenseQueryHookResult = ReturnType<typeof useCategoriesOnCategoryNavigationSectionSuspenseQuery>;
export type CategoriesOnCategoryNavigationSectionQueryResult = Apollo.QueryResult<CategoriesOnCategoryNavigationSectionQuery, CategoriesOnCategoryNavigationSectionQueryVariables>;