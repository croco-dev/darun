import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type SignImageUploadOnUseImageUploadMutationVariables = Types.Exact<{
  input: Types.SignImageUploadInput;
}>;


export type SignImageUploadOnUseImageUploadMutation = { __typename?: 'Mutation', signImageUpload: { __typename?: 'SignImageUploadPayload', signature: string, folder: string, timestamp: number } };


export const SignImageUploadOnUseImageUploadDocument = gql`
    mutation SignImageUploadOnUseImageUpload($input: SignImageUploadInput!) {
  signImageUpload(input: $input) {
    signature
    folder
    timestamp
  }
}
    `;
export type SignImageUploadOnUseImageUploadMutationFn = Apollo.MutationFunction<SignImageUploadOnUseImageUploadMutation, SignImageUploadOnUseImageUploadMutationVariables>;

/**
 * __useSignImageUploadOnUseImageUploadMutation__
 *
 * To run a mutation, you first call `useSignImageUploadOnUseImageUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignImageUploadOnUseImageUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signImageUploadOnUseImageUploadMutation, { data, loading, error }] = useSignImageUploadOnUseImageUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSignImageUploadOnUseImageUploadMutation(baseOptions?: Apollo.MutationHookOptions<SignImageUploadOnUseImageUploadMutation, SignImageUploadOnUseImageUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignImageUploadOnUseImageUploadMutation, SignImageUploadOnUseImageUploadMutationVariables>(SignImageUploadOnUseImageUploadDocument, options);
      }
export type SignImageUploadOnUseImageUploadMutationHookResult = ReturnType<typeof useSignImageUploadOnUseImageUploadMutation>;
export type SignImageUploadOnUseImageUploadMutationResult = Apollo.MutationResult<SignImageUploadOnUseImageUploadMutation>;
export type SignImageUploadOnUseImageUploadMutationOptions = Apollo.BaseMutationOptions<SignImageUploadOnUseImageUploadMutation, SignImageUploadOnUseImageUploadMutationVariables>;