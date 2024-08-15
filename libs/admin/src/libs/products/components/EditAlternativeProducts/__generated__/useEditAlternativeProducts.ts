import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductBySlugOnEditAlternativeProductsQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnEditAlternativeProductsQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, alternatives: Array<{ __typename?: 'Product', id: string, name: string }> } | null };

export type SearchProductsOnEditAlternativeProductsQueryVariables = Types.Exact<{
  query: Types.Scalars['String']['input'];
}>;


export type SearchProductsOnEditAlternativeProductsQuery = { __typename?: 'Query', searchProducts: Array<{ __typename?: 'Product', id: string, name: string }> };

export type EditProductOnEditAlternativeProductsMutationVariables = Types.Exact<{
  input: Types.UpdateAlternativeProductInput;
  slug: Types.Scalars['String']['input'];
}>;


export type EditProductOnEditAlternativeProductsMutation = { __typename?: 'Mutation', updateAlternativeProduct: { __typename?: 'UpdateAlternativeProductPayload', product?: { __typename?: 'Product', id: string, alternatives: Array<{ __typename?: 'Product', id: string }> } | null } };


export const TempProductBySlugOnEditAlternativeProductsDocument = gql`
    query TempProductBySlugOnEditAlternativeProducts($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    alternatives {
      id
      name
    }
  }
}
    `;

/**
 * __useTempProductBySlugOnEditAlternativeProductsQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnEditAlternativeProductsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnEditAlternativeProductsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnEditAlternativeProductsQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnEditAlternativeProductsQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables> & ({ variables: TempProductBySlugOnEditAlternativeProductsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>(TempProductBySlugOnEditAlternativeProductsDocument, options);
      }
export function useTempProductBySlugOnEditAlternativeProductsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>(TempProductBySlugOnEditAlternativeProductsDocument, options);
        }
export function useTempProductBySlugOnEditAlternativeProductsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>(TempProductBySlugOnEditAlternativeProductsDocument, options);
        }
export type TempProductBySlugOnEditAlternativeProductsQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditAlternativeProductsQuery>;
export type TempProductBySlugOnEditAlternativeProductsLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditAlternativeProductsLazyQuery>;
export type TempProductBySlugOnEditAlternativeProductsSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditAlternativeProductsSuspenseQuery>;
export type TempProductBySlugOnEditAlternativeProductsQueryResult = Apollo.QueryResult<TempProductBySlugOnEditAlternativeProductsQuery, TempProductBySlugOnEditAlternativeProductsQueryVariables>;
export const SearchProductsOnEditAlternativeProductsDocument = gql`
    query SearchProductsOnEditAlternativeProducts($query: String!) {
  searchProducts(query: $query) {
    id
    name
  }
}
    `;

/**
 * __useSearchProductsOnEditAlternativeProductsQuery__
 *
 * To run a query within a React component, call `useSearchProductsOnEditAlternativeProductsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchProductsOnEditAlternativeProductsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchProductsOnEditAlternativeProductsQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useSearchProductsOnEditAlternativeProductsQuery(baseOptions: Apollo.QueryHookOptions<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables> & ({ variables: SearchProductsOnEditAlternativeProductsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>(SearchProductsOnEditAlternativeProductsDocument, options);
      }
export function useSearchProductsOnEditAlternativeProductsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>(SearchProductsOnEditAlternativeProductsDocument, options);
        }
export function useSearchProductsOnEditAlternativeProductsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>(SearchProductsOnEditAlternativeProductsDocument, options);
        }
export type SearchProductsOnEditAlternativeProductsQueryHookResult = ReturnType<typeof useSearchProductsOnEditAlternativeProductsQuery>;
export type SearchProductsOnEditAlternativeProductsLazyQueryHookResult = ReturnType<typeof useSearchProductsOnEditAlternativeProductsLazyQuery>;
export type SearchProductsOnEditAlternativeProductsSuspenseQueryHookResult = ReturnType<typeof useSearchProductsOnEditAlternativeProductsSuspenseQuery>;
export type SearchProductsOnEditAlternativeProductsQueryResult = Apollo.QueryResult<SearchProductsOnEditAlternativeProductsQuery, SearchProductsOnEditAlternativeProductsQueryVariables>;
export const EditProductOnEditAlternativeProductsDocument = gql`
    mutation EditProductOnEditAlternativeProducts($input: UpdateAlternativeProductInput!, $slug: String!) {
  updateAlternativeProduct(input: $input, slug: $slug) {
    product {
      id
      alternatives {
        id
      }
    }
  }
}
    `;
export type EditProductOnEditAlternativeProductsMutationFn = Apollo.MutationFunction<EditProductOnEditAlternativeProductsMutation, EditProductOnEditAlternativeProductsMutationVariables>;

/**
 * __useEditProductOnEditAlternativeProductsMutation__
 *
 * To run a mutation, you first call `useEditProductOnEditAlternativeProductsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEditProductOnEditAlternativeProductsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [editProductOnEditAlternativeProductsMutation, { data, loading, error }] = useEditProductOnEditAlternativeProductsMutation({
 *   variables: {
 *      input: // value for 'input'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useEditProductOnEditAlternativeProductsMutation(baseOptions?: Apollo.MutationHookOptions<EditProductOnEditAlternativeProductsMutation, EditProductOnEditAlternativeProductsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EditProductOnEditAlternativeProductsMutation, EditProductOnEditAlternativeProductsMutationVariables>(EditProductOnEditAlternativeProductsDocument, options);
      }
export type EditProductOnEditAlternativeProductsMutationHookResult = ReturnType<typeof useEditProductOnEditAlternativeProductsMutation>;
export type EditProductOnEditAlternativeProductsMutationResult = Apollo.MutationResult<EditProductOnEditAlternativeProductsMutation>;
export type EditProductOnEditAlternativeProductsMutationOptions = Apollo.BaseMutationOptions<EditProductOnEditAlternativeProductsMutation, EditProductOnEditAlternativeProductsMutationVariables>;