import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductBySlugOnEditProductDescriptionQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnEditProductDescriptionQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, description?: string | null } | null };

export type EditProductOnEditProductDescriptionMutationVariables = Types.Exact<{
  input: Types.EditProductInput;
  slug: Types.Scalars['String']['input'];
}>;


export type EditProductOnEditProductDescriptionMutation = { __typename?: 'Mutation', editProduct: { __typename?: 'EditProductPayload', product: { __typename?: 'Product', id: string, description?: string | null } } };


export const TempProductBySlugOnEditProductDescriptionDocument = gql`
    query TempProductBySlugOnEditProductDescription($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    description
  }
}
    `;

/**
 * __useTempProductBySlugOnEditProductDescriptionQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnEditProductDescriptionQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnEditProductDescriptionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnEditProductDescriptionQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnEditProductDescriptionQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables> & ({ variables: TempProductBySlugOnEditProductDescriptionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>(TempProductBySlugOnEditProductDescriptionDocument, options);
      }
export function useTempProductBySlugOnEditProductDescriptionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>(TempProductBySlugOnEditProductDescriptionDocument, options);
        }
export function useTempProductBySlugOnEditProductDescriptionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>(TempProductBySlugOnEditProductDescriptionDocument, options);
        }
export type TempProductBySlugOnEditProductDescriptionQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductDescriptionQuery>;
export type TempProductBySlugOnEditProductDescriptionLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductDescriptionLazyQuery>;
export type TempProductBySlugOnEditProductDescriptionSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnEditProductDescriptionSuspenseQuery>;
export type TempProductBySlugOnEditProductDescriptionQueryResult = Apollo.QueryResult<TempProductBySlugOnEditProductDescriptionQuery, TempProductBySlugOnEditProductDescriptionQueryVariables>;
export const EditProductOnEditProductDescriptionDocument = gql`
    mutation EditProductOnEditProductDescription($input: EditProductInput!, $slug: String!) {
  editProduct(input: $input, slug: $slug) {
    product {
      id
      description
    }
  }
}
    `;
export type EditProductOnEditProductDescriptionMutationFn = Apollo.MutationFunction<EditProductOnEditProductDescriptionMutation, EditProductOnEditProductDescriptionMutationVariables>;

/**
 * __useEditProductOnEditProductDescriptionMutation__
 *
 * To run a mutation, you first call `useEditProductOnEditProductDescriptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEditProductOnEditProductDescriptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [editProductOnEditProductDescriptionMutation, { data, loading, error }] = useEditProductOnEditProductDescriptionMutation({
 *   variables: {
 *      input: // value for 'input'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useEditProductOnEditProductDescriptionMutation(baseOptions?: Apollo.MutationHookOptions<EditProductOnEditProductDescriptionMutation, EditProductOnEditProductDescriptionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EditProductOnEditProductDescriptionMutation, EditProductOnEditProductDescriptionMutationVariables>(EditProductOnEditProductDescriptionDocument, options);
      }
export type EditProductOnEditProductDescriptionMutationHookResult = ReturnType<typeof useEditProductOnEditProductDescriptionMutation>;
export type EditProductOnEditProductDescriptionMutationResult = Apollo.MutationResult<EditProductOnEditProductDescriptionMutation>;
export type EditProductOnEditProductDescriptionMutationOptions = Apollo.BaseMutationOptions<EditProductOnEditProductDescriptionMutation, EditProductOnEditProductDescriptionMutationVariables>;