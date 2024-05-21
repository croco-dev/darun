import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type CreateProductFeatureOnNewProductFeatureFormMutationVariables = Types.Exact<{
  input: Types.CreateProductFeatureInput;
}>;


export type CreateProductFeatureOnNewProductFeatureFormMutation = { __typename?: 'Mutation', createProductFeature: { __typename?: 'CreateProductFeaturePayload', feature: { __typename?: 'Feature', id: string, name: string } } };


export const CreateProductFeatureOnNewProductFeatureFormDocument = gql`
    mutation CreateProductFeatureOnNewProductFeatureForm($input: CreateProductFeatureInput!) {
  createProductFeature(input: $input) {
    feature {
      id
      name
    }
  }
}
    `;
export type CreateProductFeatureOnNewProductFeatureFormMutationFn = Apollo.MutationFunction<CreateProductFeatureOnNewProductFeatureFormMutation, CreateProductFeatureOnNewProductFeatureFormMutationVariables>;

/**
 * __useCreateProductFeatureOnNewProductFeatureFormMutation__
 *
 * To run a mutation, you first call `useCreateProductFeatureOnNewProductFeatureFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProductFeatureOnNewProductFeatureFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProductFeatureOnNewProductFeatureFormMutation, { data, loading, error }] = useCreateProductFeatureOnNewProductFeatureFormMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProductFeatureOnNewProductFeatureFormMutation(baseOptions?: Apollo.MutationHookOptions<CreateProductFeatureOnNewProductFeatureFormMutation, CreateProductFeatureOnNewProductFeatureFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateProductFeatureOnNewProductFeatureFormMutation, CreateProductFeatureOnNewProductFeatureFormMutationVariables>(CreateProductFeatureOnNewProductFeatureFormDocument, options);
      }
export type CreateProductFeatureOnNewProductFeatureFormMutationHookResult = ReturnType<typeof useCreateProductFeatureOnNewProductFeatureFormMutation>;
export type CreateProductFeatureOnNewProductFeatureFormMutationResult = Apollo.MutationResult<CreateProductFeatureOnNewProductFeatureFormMutation>;
export type CreateProductFeatureOnNewProductFeatureFormMutationOptions = Apollo.BaseMutationOptions<CreateProductFeatureOnNewProductFeatureFormMutation, CreateProductFeatureOnNewProductFeatureFormMutationVariables>;