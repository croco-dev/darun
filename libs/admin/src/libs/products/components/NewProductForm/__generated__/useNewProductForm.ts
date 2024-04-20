import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type CreateProductOnNewProductFormMutationVariables = Types.Exact<{
  input: Types.CreateProductInput;
}>;


export type CreateProductOnNewProductFormMutation = { __typename?: 'Mutation', createProduct: { __typename?: 'CreateProductPayload', product: { __typename?: 'Product', id: string, slug: string } } };


export const CreateProductOnNewProductFormDocument = gql`
    mutation CreateProductOnNewProductForm($input: CreateProductInput!) {
  createProduct(input: $input) {
    product {
      id
      slug
    }
  }
}
    `;
export type CreateProductOnNewProductFormMutationFn = Apollo.MutationFunction<CreateProductOnNewProductFormMutation, CreateProductOnNewProductFormMutationVariables>;

/**
 * __useCreateProductOnNewProductFormMutation__
 *
 * To run a mutation, you first call `useCreateProductOnNewProductFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProductOnNewProductFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProductOnNewProductFormMutation, { data, loading, error }] = useCreateProductOnNewProductFormMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProductOnNewProductFormMutation(baseOptions?: Apollo.MutationHookOptions<CreateProductOnNewProductFormMutation, CreateProductOnNewProductFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateProductOnNewProductFormMutation, CreateProductOnNewProductFormMutationVariables>(CreateProductOnNewProductFormDocument, options);
      }
export type CreateProductOnNewProductFormMutationHookResult = ReturnType<typeof useCreateProductOnNewProductFormMutation>;
export type CreateProductOnNewProductFormMutationResult = Apollo.MutationResult<CreateProductOnNewProductFormMutation>;
export type CreateProductOnNewProductFormMutationOptions = Apollo.BaseMutationOptions<CreateProductOnNewProductFormMutation, CreateProductOnNewProductFormMutationVariables>;