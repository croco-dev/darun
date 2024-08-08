import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type UpvoteProductOnProductUserActionMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type UpvoteProductOnProductUserActionMutation = { __typename?: 'Mutation', upvoteProduct: { __typename?: 'UpvoteProductPayload', product?: { __typename?: 'Product', id: string, voteCount: number } | null } };


export const UpvoteProductOnProductUserActionDocument = gql`
    mutation UpvoteProductOnProductUserAction($slug: String!) {
  upvoteProduct(slug: $slug) {
    product {
      id
      voteCount
    }
  }
}
    `;
export type UpvoteProductOnProductUserActionMutationFn = Apollo.MutationFunction<UpvoteProductOnProductUserActionMutation, UpvoteProductOnProductUserActionMutationVariables>;

/**
 * __useUpvoteProductOnProductUserActionMutation__
 *
 * To run a mutation, you first call `useUpvoteProductOnProductUserActionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpvoteProductOnProductUserActionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upvoteProductOnProductUserActionMutation, { data, loading, error }] = useUpvoteProductOnProductUserActionMutation({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useUpvoteProductOnProductUserActionMutation(baseOptions?: Apollo.MutationHookOptions<UpvoteProductOnProductUserActionMutation, UpvoteProductOnProductUserActionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpvoteProductOnProductUserActionMutation, UpvoteProductOnProductUserActionMutationVariables>(UpvoteProductOnProductUserActionDocument, options);
      }
export type UpvoteProductOnProductUserActionMutationHookResult = ReturnType<typeof useUpvoteProductOnProductUserActionMutation>;
export type UpvoteProductOnProductUserActionMutationResult = Apollo.MutationResult<UpvoteProductOnProductUserActionMutation>;
export type UpvoteProductOnProductUserActionMutationOptions = Apollo.BaseMutationOptions<UpvoteProductOnProductUserActionMutation, UpvoteProductOnProductUserActionMutationVariables>;