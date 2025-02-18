import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CreateMagazineOnWriteMagazineMutationVariables = Types.Exact<{
  input: Types.CreateMagazineInput;
}>;


export type CreateMagazineOnWriteMagazineMutation = { __typename?: 'Mutation', createMagazine: { __typename?: 'CreateMagazinePayload', magazine: { __typename?: 'Magazine', id: string, slug: string } } };


export const CreateMagazineOnWriteMagazineDocument = gql`
    mutation CreateMagazineOnWriteMagazine($input: CreateMagazineInput!) {
  createMagazine(input: $input) {
    magazine {
      id
      slug
    }
  }
}
    `;
export type CreateMagazineOnWriteMagazineMutationFn = Apollo.MutationFunction<CreateMagazineOnWriteMagazineMutation, CreateMagazineOnWriteMagazineMutationVariables>;

/**
 * __useCreateMagazineOnWriteMagazineMutation__
 *
 * To run a mutation, you first call `useCreateMagazineOnWriteMagazineMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMagazineOnWriteMagazineMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMagazineOnWriteMagazineMutation, { data, loading, error }] = useCreateMagazineOnWriteMagazineMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMagazineOnWriteMagazineMutation(baseOptions?: Apollo.MutationHookOptions<CreateMagazineOnWriteMagazineMutation, CreateMagazineOnWriteMagazineMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMagazineOnWriteMagazineMutation, CreateMagazineOnWriteMagazineMutationVariables>(CreateMagazineOnWriteMagazineDocument, options);
      }
export type CreateMagazineOnWriteMagazineMutationHookResult = ReturnType<typeof useCreateMagazineOnWriteMagazineMutation>;
export type CreateMagazineOnWriteMagazineMutationResult = Apollo.MutationResult<CreateMagazineOnWriteMagazineMutation>;
export type CreateMagazineOnWriteMagazineMutationOptions = Apollo.BaseMutationOptions<CreateMagazineOnWriteMagazineMutation, CreateMagazineOnWriteMagazineMutationVariables>;