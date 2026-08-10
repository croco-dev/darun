import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type SignImageUploadMutationVariables = Types.Exact<{
  input: Types.SignImageUploadInput;
}>;


export type SignImageUploadMutation = { __typename?: 'Mutation', signImageUpload: { __typename?: 'SignImageUploadPayload', signature: string, folder: string, timestamp: number } };


export const SignImageUploadDocument = gql`
    mutation SignImageUpload($input: SignImageUploadInput!) {
  signImageUpload(input: $input) {
    signature
    folder
    timestamp
  }
}
    `;
export type SignImageUploadMutationFn = Apollo.MutationFunction<SignImageUploadMutation, SignImageUploadMutationVariables>;

/**
 * __useSignImageUploadMutation__
 *
 * To run a mutation, you first call `useSignImageUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSignImageUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [signImageUploadMutation, { data, loading, error }] = useSignImageUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSignImageUploadMutation(baseOptions?: Apollo.MutationHookOptions<SignImageUploadMutation, SignImageUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SignImageUploadMutation, SignImageUploadMutationVariables>(SignImageUploadDocument, options);
      }
export type SignImageUploadMutationHookResult = ReturnType<typeof useSignImageUploadMutation>;
export type SignImageUploadMutationResult = Apollo.MutationResult<SignImageUploadMutation>;
export type SignImageUploadMutationOptions = Apollo.BaseMutationOptions<SignImageUploadMutation, SignImageUploadMutationVariables>;