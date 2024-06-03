import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type AddProductScreenshotOnNewProductScreenshotFormMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  input: Types.AddProductScreenshotInput;
}>;


export type AddProductScreenshotOnNewProductScreenshotFormMutation = { __typename?: 'Mutation', addProductScreenshot: { __typename?: 'AddProductScreenshotPayload', product?: { __typename?: 'Product', id: string, screenshots: Array<{ __typename?: 'Screenshot', id: string, imageAlt: string, imageUrl: string }> } | null } };


export const AddProductScreenshotOnNewProductScreenshotFormDocument = gql`
    mutation AddProductScreenshotOnNewProductScreenshotForm($slug: String!, $input: AddProductScreenshotInput!) {
  addProductScreenshot(slug: $slug, input: $input) {
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
export type AddProductScreenshotOnNewProductScreenshotFormMutationFn = Apollo.MutationFunction<AddProductScreenshotOnNewProductScreenshotFormMutation, AddProductScreenshotOnNewProductScreenshotFormMutationVariables>;

/**
 * __useAddProductScreenshotOnNewProductScreenshotFormMutation__
 *
 * To run a mutation, you first call `useAddProductScreenshotOnNewProductScreenshotFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddProductScreenshotOnNewProductScreenshotFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addProductScreenshotOnNewProductScreenshotFormMutation, { data, loading, error }] = useAddProductScreenshotOnNewProductScreenshotFormMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddProductScreenshotOnNewProductScreenshotFormMutation(baseOptions?: Apollo.MutationHookOptions<AddProductScreenshotOnNewProductScreenshotFormMutation, AddProductScreenshotOnNewProductScreenshotFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddProductScreenshotOnNewProductScreenshotFormMutation, AddProductScreenshotOnNewProductScreenshotFormMutationVariables>(AddProductScreenshotOnNewProductScreenshotFormDocument, options);
      }
export type AddProductScreenshotOnNewProductScreenshotFormMutationHookResult = ReturnType<typeof useAddProductScreenshotOnNewProductScreenshotFormMutation>;
export type AddProductScreenshotOnNewProductScreenshotFormMutationResult = Apollo.MutationResult<AddProductScreenshotOnNewProductScreenshotFormMutation>;
export type AddProductScreenshotOnNewProductScreenshotFormMutationOptions = Apollo.BaseMutationOptions<AddProductScreenshotOnNewProductScreenshotFormMutation, AddProductScreenshotOnNewProductScreenshotFormMutationVariables>;