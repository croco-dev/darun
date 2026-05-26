import * as Types from "@darun/provider-graphql";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client/react";
const defaultOptions = {} as const;
export type GenerateProductDescriptionMutationVariables = Types.Exact<{
  input: Types.GenerateProductDescriptionInput;
}>;

export type GenerateProductDescriptionMutation = {
  __typename?: "Mutation";
  generateProductDescription: {
    __typename?: "GenerateProductDescriptionPayload";
    product: {
      __typename?: "Product";
      id: string;
      name: string;
      description?: string | null;
    };
  };
};

export const GenerateProductDescriptionDocument = gql`
  mutation GenerateProductDescription(
    $input: GenerateProductDescriptionInput!
  ) {
    generateProductDescription(input: $input) {
      product {
        id
        name
        description
      }
    }
  }
`;
export type GenerateProductDescriptionMutationFn = Apollo.MutationFunctionOptions<
  GenerateProductDescriptionMutation,
  GenerateProductDescriptionMutationVariables
>;

/**
 * __useGenerateProductDescriptionMutation__
 *
 * To run a mutation, you first call `useGenerateProductDescriptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateProductDescriptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateProductDescriptionMutation, { data, loading, error }] = useGenerateProductDescriptionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGenerateProductDescriptionMutation(
  baseOptions?: Apollo.MutationHookOptions<
    GenerateProductDescriptionMutation,
    GenerateProductDescriptionMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    GenerateProductDescriptionMutation,
    GenerateProductDescriptionMutationVariables
  >(GenerateProductDescriptionDocument, options);
}
export type GenerateProductDescriptionMutationHookResult = ReturnType<
  typeof useGenerateProductDescriptionMutation
>;
export type GenerateProductDescriptionMutationResult =
  Apollo.MutationResult<GenerateProductDescriptionMutation>;
export type GenerateProductDescriptionMutationOptions =
  Apollo.MutationHookOptions<
    GenerateProductDescriptionMutation,
    GenerateProductDescriptionMutationVariables
  >;
