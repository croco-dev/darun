import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type RegisterProductCompanyOnEditProductCompanyMutationVariables = Types.Exact<{
  input: Types.RegisterProductCompanyInput;
  slug: Types.Scalars['String']['input'];
}>;


export type RegisterProductCompanyOnEditProductCompanyMutation = { __typename?: 'Mutation', registerProductCompany: { __typename?: 'RegisterProductCompanyPayload', product?: { __typename?: 'Product', id: string } | null } };


export const RegisterProductCompanyOnEditProductCompanyDocument = gql`
    mutation RegisterProductCompanyOnEditProductCompany($input: RegisterProductCompanyInput!, $slug: String!) {
  registerProductCompany(input: $input, slug: $slug) {
    product {
      id
    }
  }
}
    `;
export type RegisterProductCompanyOnEditProductCompanyMutationFn = Apollo.MutationFunction<RegisterProductCompanyOnEditProductCompanyMutation, RegisterProductCompanyOnEditProductCompanyMutationVariables>;

/**
 * __useRegisterProductCompanyOnEditProductCompanyMutation__
 *
 * To run a mutation, you first call `useRegisterProductCompanyOnEditProductCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterProductCompanyOnEditProductCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerProductCompanyOnEditProductCompanyMutation, { data, loading, error }] = useRegisterProductCompanyOnEditProductCompanyMutation({
 *   variables: {
 *      input: // value for 'input'
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useRegisterProductCompanyOnEditProductCompanyMutation(baseOptions?: Apollo.MutationHookOptions<RegisterProductCompanyOnEditProductCompanyMutation, RegisterProductCompanyOnEditProductCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterProductCompanyOnEditProductCompanyMutation, RegisterProductCompanyOnEditProductCompanyMutationVariables>(RegisterProductCompanyOnEditProductCompanyDocument, options);
      }
export type RegisterProductCompanyOnEditProductCompanyMutationHookResult = ReturnType<typeof useRegisterProductCompanyOnEditProductCompanyMutation>;
export type RegisterProductCompanyOnEditProductCompanyMutationResult = Apollo.MutationResult<RegisterProductCompanyOnEditProductCompanyMutation>;
export type RegisterProductCompanyOnEditProductCompanyMutationOptions = Apollo.BaseMutationOptions<RegisterProductCompanyOnEditProductCompanyMutation, RegisterProductCompanyOnEditProductCompanyMutationVariables>;