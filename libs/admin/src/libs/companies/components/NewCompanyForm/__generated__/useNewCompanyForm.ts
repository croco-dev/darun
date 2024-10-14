import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type CreateCompanyOnNewCompanyFormMutationVariables = Types.Exact<{
  input: Types.CreateCompanyInput;
}>;


export type CreateCompanyOnNewCompanyFormMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'CreateCompanyPayload', company: { __typename?: 'Company', id: string } } };


export const CreateCompanyOnNewCompanyFormDocument = gql`
    mutation CreateCompanyOnNewCompanyForm($input: CreateCompanyInput!) {
  createCompany(input: $input) {
    company {
      id
    }
  }
}
    `;
export type CreateCompanyOnNewCompanyFormMutationFn = Apollo.MutationFunction<CreateCompanyOnNewCompanyFormMutation, CreateCompanyOnNewCompanyFormMutationVariables>;

/**
 * __useCreateCompanyOnNewCompanyFormMutation__
 *
 * To run a mutation, you first call `useCreateCompanyOnNewCompanyFormMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCompanyOnNewCompanyFormMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCompanyOnNewCompanyFormMutation, { data, loading, error }] = useCreateCompanyOnNewCompanyFormMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCompanyOnNewCompanyFormMutation(baseOptions?: Apollo.MutationHookOptions<CreateCompanyOnNewCompanyFormMutation, CreateCompanyOnNewCompanyFormMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCompanyOnNewCompanyFormMutation, CreateCompanyOnNewCompanyFormMutationVariables>(CreateCompanyOnNewCompanyFormDocument, options);
      }
export type CreateCompanyOnNewCompanyFormMutationHookResult = ReturnType<typeof useCreateCompanyOnNewCompanyFormMutation>;
export type CreateCompanyOnNewCompanyFormMutationResult = Apollo.MutationResult<CreateCompanyOnNewCompanyFormMutation>;
export type CreateCompanyOnNewCompanyFormMutationOptions = Apollo.BaseMutationOptions<CreateCompanyOnNewCompanyFormMutation, CreateCompanyOnNewCompanyFormMutationVariables>;