import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import { ProductLinkTableFragmentDoc } from '../../ProductLinkTable/__generated__/ProductLinkTable';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type UpdateProductLinkOnEditProductLinkItemMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
  input: Types.UpdateProductLinkInput;
}>;


export type UpdateProductLinkOnEditProductLinkItemMutation = { __typename?: 'Mutation', updateProductLink: { __typename?: 'UpdateProductLinkPayload', product?: { __typename?: 'Product', id: string, links: Array<{ __typename?: 'Link', id: string, title: string, link: string, displayLink: string, iconUrl: string, isPrimary: boolean }> } | null } };


export const UpdateProductLinkOnEditProductLinkItemDocument = gql`
    mutation UpdateProductLinkOnEditProductLinkItem($slug: String!, $id: String!, $input: UpdateProductLinkInput!) {
  updateProductLink(slug: $slug, id: $id, input: $input) {
    product {
      id
      ...ProductLinkTable
    }
  }
}
    ${ProductLinkTableFragmentDoc}`;
export type UpdateProductLinkOnEditProductLinkItemMutationFn = Apollo.MutationFunction<UpdateProductLinkOnEditProductLinkItemMutation, UpdateProductLinkOnEditProductLinkItemMutationVariables>;

/**
 * __useUpdateProductLinkOnEditProductLinkItemMutation__
 *
 * To run a mutation, you first call `useUpdateProductLinkOnEditProductLinkItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProductLinkOnEditProductLinkItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProductLinkOnEditProductLinkItemMutation, { data, loading, error }] = useUpdateProductLinkOnEditProductLinkItemMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProductLinkOnEditProductLinkItemMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProductLinkOnEditProductLinkItemMutation, UpdateProductLinkOnEditProductLinkItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProductLinkOnEditProductLinkItemMutation, UpdateProductLinkOnEditProductLinkItemMutationVariables>(UpdateProductLinkOnEditProductLinkItemDocument, options);
      }
export type UpdateProductLinkOnEditProductLinkItemMutationHookResult = ReturnType<typeof useUpdateProductLinkOnEditProductLinkItemMutation>;
export type UpdateProductLinkOnEditProductLinkItemMutationResult = Apollo.MutationResult<UpdateProductLinkOnEditProductLinkItemMutation>;
export type UpdateProductLinkOnEditProductLinkItemMutationOptions = Apollo.BaseMutationOptions<UpdateProductLinkOnEditProductLinkItemMutation, UpdateProductLinkOnEditProductLinkItemMutationVariables>;