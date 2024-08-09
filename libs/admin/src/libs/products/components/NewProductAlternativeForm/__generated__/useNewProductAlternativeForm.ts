import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AddAlternativeProductOnNewProductAlternativeFormMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  input: Types.AddAlternativeProductInput;
}>;


export type AddAlternativeProductOnNewProductAlternativeFormMutation = { __typename?: 'Mutation', addAlternativeProduct: { __typename?: 'AddAlternativeProductPayload', product?: { __typename?: 'Product', id: string, alternatives: Array<{ __typename?: 'Product', id: string }> } | null } };


export const AddAlternativeProductOnNewProductAlternativeFormDocument = gql`
    mutation AddAlternativeProductOnNewProductAlternativeForm($slug: String!, $input: AddAlternativeProductInput!) {
  addAlternativeProduct(slug: $slug, input: $input) {
    product {
      id
      alternatives {
        id
      }
    }
  }
}
    `;
export type AddAlternativeProductOnNewProductAlternativeFormMutationFn = Apollo.MutationFunction<AddAlternativeProductOnNewProductAlternativeFormMutation, AddAlternativeProductOnNewProductAlternativeFormMutationVariables>;

/**
 * __useAddAlternativeProductOnNewProductAlternativeFormMutation__
 *
 * To run a mutation, you first call `useAddAlternativeProductOnNewProductAlternativeFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddAlternativeProductOnNewProductAlternativeFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addAlternativeProductOnNewProductAlternativeFormMutation, { data, loading, error }] = useAddAlternativeProductOnNewProductAlternativeFormMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddAlternativeProductOnNewProductAlternativeFormMutation(baseOptions?: Apollo.MutationHookOptions<AddAlternativeProductOnNewProductAlternativeFormMutation, AddAlternativeProductOnNewProductAlternativeFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddAlternativeProductOnNewProductAlternativeFormMutation, AddAlternativeProductOnNewProductAlternativeFormMutationVariables>(AddAlternativeProductOnNewProductAlternativeFormDocument, options);
      }
export type AddAlternativeProductOnNewProductAlternativeFormMutationHookResult = ReturnType<typeof useAddAlternativeProductOnNewProductAlternativeFormMutation>;
export type AddAlternativeProductOnNewProductAlternativeFormMutationResult = Apollo.MutationResult<AddAlternativeProductOnNewProductAlternativeFormMutation>;
export type AddAlternativeProductOnNewProductAlternativeFormMutationOptions = Apollo.BaseMutationOptions<AddAlternativeProductOnNewProductAlternativeFormMutation, AddAlternativeProductOnNewProductAlternativeFormMutationVariables>;