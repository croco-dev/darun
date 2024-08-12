import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AdminFeatureByIdOnEditProductFeatureItemQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;


export type AdminFeatureByIdOnEditProductFeatureItemQuery = { __typename?: 'Query', adminFeatureById?: { __typename?: 'Feature', id: string, emoji: string, name: string, summary?: string | null } | null };

export type UpdateProductFeatureOnEditProductFeatureItemMutationVariables = Types.Exact<{
  input: Types.UpdateProductFeatureInput;
  featureId: Types.Scalars['String']['input'];
}>;


export type UpdateProductFeatureOnEditProductFeatureItemMutation = { __typename?: 'Mutation', updateProductFeature: { __typename?: 'UpdateProductFeaturePayload', feature: { __typename?: 'Feature', id: string } } };


export const AdminFeatureByIdOnEditProductFeatureItemDocument = gql`
    query AdminFeatureByIdOnEditProductFeatureItem($id: String!) {
  adminFeatureById(id: $id) {
    id
    emoji
    name
    summary
  }
}
    `;

/**
 * __useAdminFeatureByIdOnEditProductFeatureItemQuery__
 *
 * To run a query within a React component, call `useAdminFeatureByIdOnEditProductFeatureItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useAdminFeatureByIdOnEditProductFeatureItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAdminFeatureByIdOnEditProductFeatureItemQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAdminFeatureByIdOnEditProductFeatureItemQuery(baseOptions: Apollo.QueryHookOptions<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables> & ({ variables: AdminFeatureByIdOnEditProductFeatureItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>(AdminFeatureByIdOnEditProductFeatureItemDocument, options);
      }
export function useAdminFeatureByIdOnEditProductFeatureItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>(AdminFeatureByIdOnEditProductFeatureItemDocument, options);
        }
export function useAdminFeatureByIdOnEditProductFeatureItemSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>(AdminFeatureByIdOnEditProductFeatureItemDocument, options);
        }
export type AdminFeatureByIdOnEditProductFeatureItemQueryHookResult = ReturnType<typeof useAdminFeatureByIdOnEditProductFeatureItemQuery>;
export type AdminFeatureByIdOnEditProductFeatureItemLazyQueryHookResult = ReturnType<typeof useAdminFeatureByIdOnEditProductFeatureItemLazyQuery>;
export type AdminFeatureByIdOnEditProductFeatureItemSuspenseQueryHookResult = ReturnType<typeof useAdminFeatureByIdOnEditProductFeatureItemSuspenseQuery>;
export type AdminFeatureByIdOnEditProductFeatureItemQueryResult = Apollo.QueryResult<AdminFeatureByIdOnEditProductFeatureItemQuery, AdminFeatureByIdOnEditProductFeatureItemQueryVariables>;
export const UpdateProductFeatureOnEditProductFeatureItemDocument = gql`
    mutation UpdateProductFeatureOnEditProductFeatureItem($input: UpdateProductFeatureInput!, $featureId: String!) {
  updateProductFeature(input: $input, id: $featureId) {
    feature {
      id
    }
  }
}
    `;
export type UpdateProductFeatureOnEditProductFeatureItemMutationFn = Apollo.MutationFunction<UpdateProductFeatureOnEditProductFeatureItemMutation, UpdateProductFeatureOnEditProductFeatureItemMutationVariables>;

/**
 * __useUpdateProductFeatureOnEditProductFeatureItemMutation__
 *
 * To run a mutation, you first call `useUpdateProductFeatureOnEditProductFeatureItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProductFeatureOnEditProductFeatureItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProductFeatureOnEditProductFeatureItemMutation, { data, loading, error }] = useUpdateProductFeatureOnEditProductFeatureItemMutation({
 *   variables: {
 *      input: // value for 'input'
 *      featureId: // value for 'featureId'
 *   },
 * });
 */
export function useUpdateProductFeatureOnEditProductFeatureItemMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProductFeatureOnEditProductFeatureItemMutation, UpdateProductFeatureOnEditProductFeatureItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProductFeatureOnEditProductFeatureItemMutation, UpdateProductFeatureOnEditProductFeatureItemMutationVariables>(UpdateProductFeatureOnEditProductFeatureItemDocument, options);
      }
export type UpdateProductFeatureOnEditProductFeatureItemMutationHookResult = ReturnType<typeof useUpdateProductFeatureOnEditProductFeatureItemMutation>;
export type UpdateProductFeatureOnEditProductFeatureItemMutationResult = Apollo.MutationResult<UpdateProductFeatureOnEditProductFeatureItemMutation>;
export type UpdateProductFeatureOnEditProductFeatureItemMutationOptions = Apollo.BaseMutationOptions<UpdateProductFeatureOnEditProductFeatureItemMutation, UpdateProductFeatureOnEditProductFeatureItemMutationVariables>;