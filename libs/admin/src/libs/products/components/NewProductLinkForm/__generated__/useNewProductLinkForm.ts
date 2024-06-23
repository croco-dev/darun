import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type AddProductLinkOnNewProductLinkFormMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  input: Types.AddProductLinkInput;
}>;


export type AddProductLinkOnNewProductLinkFormMutation = { __typename?: 'Mutation', addProductLink: { __typename?: 'AddProductLinkPayload', product?: { __typename?: 'Product', id: string, screenshots: Array<{ __typename?: 'Screenshot', id: string, imageAlt: string, imageUrl: string }> } | null } };


export const AddProductLinkOnNewProductLinkFormDocument = gql`
    mutation AddProductLinkOnNewProductLinkForm($slug: String!, $input: AddProductLinkInput!) {
  addProductLink(slug: $slug, input: $input) {
    product {
      id
      screenshots {
        id
        imageAlt
        imageUrl
      }
    }
  }
}
    `;
export type AddProductLinkOnNewProductLinkFormMutationFn = Apollo.MutationFunction<AddProductLinkOnNewProductLinkFormMutation, AddProductLinkOnNewProductLinkFormMutationVariables>;

/**
 * __useAddProductLinkOnNewProductLinkFormMutation__
 *
 * To run a mutation, you first call `useAddProductLinkOnNewProductLinkFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddProductLinkOnNewProductLinkFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addProductLinkOnNewProductLinkFormMutation, { data, loading, error }] = useAddProductLinkOnNewProductLinkFormMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddProductLinkOnNewProductLinkFormMutation(baseOptions?: Apollo.MutationHookOptions<AddProductLinkOnNewProductLinkFormMutation, AddProductLinkOnNewProductLinkFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddProductLinkOnNewProductLinkFormMutation, AddProductLinkOnNewProductLinkFormMutationVariables>(AddProductLinkOnNewProductLinkFormDocument, options);
      }
export type AddProductLinkOnNewProductLinkFormMutationHookResult = ReturnType<typeof useAddProductLinkOnNewProductLinkFormMutation>;
export type AddProductLinkOnNewProductLinkFormMutationResult = Apollo.MutationResult<AddProductLinkOnNewProductLinkFormMutation>;
export type AddProductLinkOnNewProductLinkFormMutationOptions = Apollo.BaseMutationOptions<AddProductLinkOnNewProductLinkFormMutation, AddProductLinkOnNewProductLinkFormMutationVariables>;