import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type IndexProductOnIndexProductButtonMutationVariables = Types.Exact<{
  input: Types.IndexProductInput;
}>;


export type IndexProductOnIndexProductButtonMutation = { __typename?: 'Mutation', indexProduct: { __typename?: 'IndexProductPayload', indexed: boolean } };


export const IndexProductOnIndexProductButtonDocument = gql`
    mutation IndexProductOnIndexProductButton($input: IndexProductInput!) {
  indexProduct(input: $input) {
    indexed
  }
}
    `;
export type IndexProductOnIndexProductButtonMutationFn = Apollo.MutationFunction<IndexProductOnIndexProductButtonMutation, IndexProductOnIndexProductButtonMutationVariables>;

/**
 * __useIndexProductOnIndexProductButtonMutation__
 *
 * To run a mutation, you first call `useIndexProductOnIndexProductButtonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIndexProductOnIndexProductButtonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [indexProductOnIndexProductButtonMutation, { data, loading, error }] = useIndexProductOnIndexProductButtonMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useIndexProductOnIndexProductButtonMutation(baseOptions?: Apollo.MutationHookOptions<IndexProductOnIndexProductButtonMutation, IndexProductOnIndexProductButtonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IndexProductOnIndexProductButtonMutation, IndexProductOnIndexProductButtonMutationVariables>(IndexProductOnIndexProductButtonDocument, options);
      }
export type IndexProductOnIndexProductButtonMutationHookResult = ReturnType<typeof useIndexProductOnIndexProductButtonMutation>;
export type IndexProductOnIndexProductButtonMutationResult = Apollo.MutationResult<IndexProductOnIndexProductButtonMutation>;
export type IndexProductOnIndexProductButtonMutationOptions = Apollo.BaseMutationOptions<IndexProductOnIndexProductButtonMutation, IndexProductOnIndexProductButtonMutationVariables>;