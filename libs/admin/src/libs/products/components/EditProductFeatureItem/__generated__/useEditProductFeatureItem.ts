import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type FeatureOnEditProductFeatureItemQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;


export type FeatureOnEditProductFeatureItemQuery = { __typename?: 'Query', feature?: { __typename?: 'Feature', id: string, emoji: string, name: string, summary?: string | null } | null };

export type UpdateProductFeatureOnEditProductFeatureItemMutationVariables = Types.Exact<{
  input: Types.UpdateProductFeatureInput;
  featureId: Types.Scalars['String']['input'];
}>;


export type UpdateProductFeatureOnEditProductFeatureItemMutation = { __typename?: 'Mutation', updateProductFeature: { __typename?: 'UpdateProductFeaturePayload', feature: { __typename?: 'Feature', id: string } } };


export const FeatureOnEditProductFeatureItemDocument = gql`
    query FeatureOnEditProductFeatureItem($id: ID!) {
  feature(id: $id) {
    id
    emoji
    name
    summary
  }
}
    `;

/**
 * __useFeatureOnEditProductFeatureItemQuery__
 *
 * To run a query within a React component, call `useFeatureOnEditProductFeatureItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useFeatureOnEditProductFeatureItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFeatureOnEditProductFeatureItemQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFeatureOnEditProductFeatureItemQuery(baseOptions: Apollo.QueryHookOptions<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables> & ({ variables: FeatureOnEditProductFeatureItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>(FeatureOnEditProductFeatureItemDocument, options);
      }
export function useFeatureOnEditProductFeatureItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>(FeatureOnEditProductFeatureItemDocument, options);
        }
export function useFeatureOnEditProductFeatureItemSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>(FeatureOnEditProductFeatureItemDocument, options);
        }
export type FeatureOnEditProductFeatureItemQueryHookResult = ReturnType<typeof useFeatureOnEditProductFeatureItemQuery>;
export type FeatureOnEditProductFeatureItemLazyQueryHookResult = ReturnType<typeof useFeatureOnEditProductFeatureItemLazyQuery>;
export type FeatureOnEditProductFeatureItemSuspenseQueryHookResult = ReturnType<typeof useFeatureOnEditProductFeatureItemSuspenseQuery>;
export type FeatureOnEditProductFeatureItemQueryResult = Apollo.QueryResult<FeatureOnEditProductFeatureItemQuery, FeatureOnEditProductFeatureItemQueryVariables>;
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