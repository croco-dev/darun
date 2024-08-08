import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type TempProductBySlugOnEditProductInfoQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnEditProductInfoQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, name: string, summary: string, logoUrl: string } | null };

export type EditProductOnEditProductInfoMutationVariables = Types.Exact<{
  input: Types.EditProductInput;
  slug: Types.Scalars['String']['input'];
}>;


export type EditProductOnEditProductInfoMutation = { __typename?: 'Mutation', editProduct: { __typename?: 'EditProductPayload', product: { __typename?: 'Product', id: string } } };


export const TempProductBySlugOnEditProductInfoDocument = gql`
    query TempProductBySlugOnEditProductInfo($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    name
    summary
    logoUrl
  }
}
    `;

/**
 * __useTempProductBySlugOnEditProductInfoQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnEditProductInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnEditProductInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnEditProductInfoQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnEditProductInfoQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables> & ({ variables: TempProductBySlugOnEditProductInfoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>(TempProductBySlugOnEditProductInfoDocument, options);
      }
export function useTempProductBySlugOnEditProductInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>(TempProductBySlugOnEditProductInfoDocument, options);
        }
export function useTempProductBySlugOnEditProductInfoSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>(TempProductBySlugOnEditProductInfoDocument, options);
        }
export type TempProductBySlugOnEditProductInfoQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductInfoQuery>;
export type TempProductBySlugOnEditProductInfoLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductInfoLazyQuery>;
export type TempProductBySlugOnEditProductInfoSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductInfoSuspenseQuery>;
export type TempProductBySlugOnEditProductInfoQueryResult = Apollo.QueryResult<TempProductBySlugOnEditProductInfoQuery, TempProductBySlugOnEditProductInfoQueryVariables>;
export const EditProductOnEditProductInfoDocument = gql`
    mutation EditProductOnEditProductInfo($input: EditProductInput!, $slug: String!) {
  editProduct(input: $input, slug: $slug) {
    product {
      id
    }
  }
}
    `;
export type EditProductOnEditProductInfoMutationFn = Apollo.MutationFunction<EditProductOnEditProductInfoMutation, EditProductOnEditProductInfoMutationVariables>;

/**
 * __useEditProductOnEditProductInfoMutation__
 *
 * To run a mutation, you first call `useEditProductOnEditProductInfoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEditProductOnEditProductInfoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [editProductOnEditProductInfoMutation, { data, loading, error }] = useEditProductOnEditProductInfoMutation({
 *   variables: {
 *      input: // value for 'input'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useEditProductOnEditProductInfoMutation(baseOptions?: Apollo.MutationHookOptions<EditProductOnEditProductInfoMutation, EditProductOnEditProductInfoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EditProductOnEditProductInfoMutation, EditProductOnEditProductInfoMutationVariables>(EditProductOnEditProductInfoDocument, options);
      }
export type EditProductOnEditProductInfoMutationHookResult = ReturnType<typeof useEditProductOnEditProductInfoMutation>;
export type EditProductOnEditProductInfoMutationResult = Apollo.MutationResult<EditProductOnEditProductInfoMutation>;
export type EditProductOnEditProductInfoMutationOptions = Apollo.BaseMutationOptions<EditProductOnEditProductInfoMutation, EditProductOnEditProductInfoMutationVariables>;