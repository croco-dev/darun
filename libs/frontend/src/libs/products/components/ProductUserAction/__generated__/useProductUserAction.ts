import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductBySlugOnProductUserActionQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductUserActionQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, voteCount: number } | null };

export type UpvoteProductOnProductUserActionMutationVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type UpvoteProductOnProductUserActionMutation = { __typename?: 'Mutation', upvoteProduct: { __typename?: 'UpvoteProductPayload', product?: { __typename?: 'Product', id: string, voteCount: number } | null } };


export const ProductBySlugOnProductUserActionDocument = gql`
    query ProductBySlugOnProductUserAction($slug: String!) {
  productBySlug(slug: $slug) {
    id
    voteCount
  }
}
    `;

/**
 * __useProductBySlugOnProductUserActionQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductUserActionQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductUserActionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductUserActionQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductUserActionQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables> & ({ variables: ProductBySlugOnProductUserActionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>(ProductBySlugOnProductUserActionDocument, options);
      }
export function useProductBySlugOnProductUserActionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>(ProductBySlugOnProductUserActionDocument, options);
        }
export function useProductBySlugOnProductUserActionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>(ProductBySlugOnProductUserActionDocument, options);
        }
export type ProductBySlugOnProductUserActionQueryHookResult = ReturnType<typeof useProductBySlugOnProductUserActionQuery>;
export type ProductBySlugOnProductUserActionLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductUserActionLazyQuery>;
export type ProductBySlugOnProductUserActionSuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductUserActionSuspenseQuery>;
export type ProductBySlugOnProductUserActionQueryResult = Apollo.QueryResult<ProductBySlugOnProductUserActionQuery, ProductBySlugOnProductUserActionQueryVariables>;
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