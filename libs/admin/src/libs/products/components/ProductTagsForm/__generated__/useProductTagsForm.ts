import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductTagsFormQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductTagsFormQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }> } | null };

export type AddProductTagsOnProductTagFormMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  input: Types.AddProductTagsInput;
}>;


export type AddProductTagsOnProductTagFormMutation = { __typename?: 'Mutation', addProductTags: { __typename?: 'AddProductTagsPayload', product?: { __typename?: 'Product', id: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }> } | null } };


export const TempProductBySlugOnProductTagsFormDocument = gql`
    query TempProductBySlugOnProductTagsForm($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useTempProductBySlugOnProductTagsFormQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductTagsFormQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductTagsFormQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductTagsFormQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductTagsFormQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables> & ({ variables: TempProductBySlugOnProductTagsFormQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>(TempProductBySlugOnProductTagsFormDocument, options);
      }
export function useTempProductBySlugOnProductTagsFormLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>(TempProductBySlugOnProductTagsFormDocument, options);
        }
export function useTempProductBySlugOnProductTagsFormSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>(TempProductBySlugOnProductTagsFormDocument, options);
        }
export type TempProductBySlugOnProductTagsFormQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductTagsFormQuery>;
export type TempProductBySlugOnProductTagsFormLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductTagsFormLazyQuery>;
export type TempProductBySlugOnProductTagsFormSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductTagsFormSuspenseQuery>;
export type TempProductBySlugOnProductTagsFormQueryResult = Apollo.QueryResult<TempProductBySlugOnProductTagsFormQuery, TempProductBySlugOnProductTagsFormQueryVariables>;
export const AddProductTagsOnProductTagFormDocument = gql`
    mutation AddProductTagsOnProductTagForm($slug: String!, $input: AddProductTagsInput!) {
  addProductTags(slug: $slug, input: $input) {
    product {
      id
      tags {
        id
        name
      }
    }
  }
}
    `;
export type AddProductTagsOnProductTagFormMutationFn = Apollo.MutationFunction<AddProductTagsOnProductTagFormMutation, AddProductTagsOnProductTagFormMutationVariables>;

/**
 * __useAddProductTagsOnProductTagFormMutation__
 *
 * To run a mutation, you first call `useAddProductTagsOnProductTagFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddProductTagsOnProductTagFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addProductTagsOnProductTagFormMutation, { data, loading, error }] = useAddProductTagsOnProductTagFormMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddProductTagsOnProductTagFormMutation(baseOptions?: Apollo.MutationHookOptions<AddProductTagsOnProductTagFormMutation, AddProductTagsOnProductTagFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddProductTagsOnProductTagFormMutation, AddProductTagsOnProductTagFormMutationVariables>(AddProductTagsOnProductTagFormDocument, options);
      }
export type AddProductTagsOnProductTagFormMutationHookResult = ReturnType<typeof useAddProductTagsOnProductTagFormMutation>;
export type AddProductTagsOnProductTagFormMutationResult = Apollo.MutationResult<AddProductTagsOnProductTagFormMutation>;
export type AddProductTagsOnProductTagFormMutationOptions = Apollo.BaseMutationOptions<AddProductTagsOnProductTagFormMutation, AddProductTagsOnProductTagFormMutationVariables>;