import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductOnPublishProductButtonQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductOnPublishProductButtonQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, publishedAt?: any | null } | null };

export type PublishProductOnPublishProductButtonMutationVariables = Types.Exact<{
  input: Types.PublishProductInput;
}>;


export type PublishProductOnPublishProductButtonMutation = { __typename?: 'Mutation', publishProduct: { __typename?: 'PublishProductPayload', product: { __typename?: 'Product', id: string, publishedAt?: any | null } } };


export const TempProductOnPublishProductButtonDocument = gql`
    query TempProductOnPublishProductButton($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    publishedAt
  }
}
    `;

/**
 * __useTempProductOnPublishProductButtonQuery__
 *
 * To run a query within a React component, call `useTempProductOnPublishProductButtonQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductOnPublishProductButtonQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductOnPublishProductButtonQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductOnPublishProductButtonQuery(baseOptions: Apollo.QueryHookOptions<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables> & ({ variables: TempProductOnPublishProductButtonQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>(TempProductOnPublishProductButtonDocument, options);
      }
export function useTempProductOnPublishProductButtonLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>(TempProductOnPublishProductButtonDocument, options);
        }
export function useTempProductOnPublishProductButtonSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>(TempProductOnPublishProductButtonDocument, options);
        }
export type TempProductOnPublishProductButtonQueryHookResult = ReturnType<typeof useTempProductOnPublishProductButtonQuery>;
export type TempProductOnPublishProductButtonLazyQueryHookResult = ReturnType<typeof useTempProductOnPublishProductButtonLazyQuery>;
export type TempProductOnPublishProductButtonSuspenseQueryHookResult = ReturnType<typeof useTempProductOnPublishProductButtonSuspenseQuery>;
export type TempProductOnPublishProductButtonQueryResult = Apollo.QueryResult<TempProductOnPublishProductButtonQuery, TempProductOnPublishProductButtonQueryVariables>;
export const PublishProductOnPublishProductButtonDocument = gql`
    mutation PublishProductOnPublishProductButton($input: PublishProductInput!) {
  publishProduct(input: $input) {
    product {
      id
      publishedAt
    }
  }
}
    `;
export type PublishProductOnPublishProductButtonMutationFn = Apollo.MutationFunction<PublishProductOnPublishProductButtonMutation, PublishProductOnPublishProductButtonMutationVariables>;

/**
 * __usePublishProductOnPublishProductButtonMutation__
 *
 * To run a mutation, you first call `usePublishProductOnPublishProductButtonMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishProductOnPublishProductButtonMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishProductOnPublishProductButtonMutation, { data, loading, error }] = usePublishProductOnPublishProductButtonMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePublishProductOnPublishProductButtonMutation(baseOptions?: Apollo.MutationHookOptions<PublishProductOnPublishProductButtonMutation, PublishProductOnPublishProductButtonMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishProductOnPublishProductButtonMutation, PublishProductOnPublishProductButtonMutationVariables>(PublishProductOnPublishProductButtonDocument, options);
      }
export type PublishProductOnPublishProductButtonMutationHookResult = ReturnType<typeof usePublishProductOnPublishProductButtonMutation>;
export type PublishProductOnPublishProductButtonMutationResult = Apollo.MutationResult<PublishProductOnPublishProductButtonMutation>;
export type PublishProductOnPublishProductButtonMutationOptions = Apollo.BaseMutationOptions<PublishProductOnPublishProductButtonMutation, PublishProductOnPublishProductButtonMutationVariables>;