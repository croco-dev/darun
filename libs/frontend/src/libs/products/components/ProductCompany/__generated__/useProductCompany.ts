import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type GetCompaniesInfoOnProductCompanyQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type GetCompaniesInfoOnProductCompanyQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, ownedCompany?: { __typename?: 'Company', id: string, name: string, type: string, region: string, address: string, size: string, startAt: any } | null } | null };


export const GetCompaniesInfoOnProductCompanyDocument = gql`
    query GetCompaniesInfoOnProductCompany($slug: String!) {
  productBySlug(slug: $slug) {
    id
    ownedCompany {
      id
      name
      type
      region
      address
      size
      startAt
    }
  }
}
    `;

/**
 * __useGetCompaniesInfoOnProductCompanyQuery__
 *
 * To run a query within a React component, call `useGetCompaniesInfoOnProductCompanyQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompaniesInfoOnProductCompanyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompaniesInfoOnProductCompanyQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetCompaniesInfoOnProductCompanyQuery(baseOptions: Apollo.QueryHookOptions<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables> & ({ variables: GetCompaniesInfoOnProductCompanyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>(GetCompaniesInfoOnProductCompanyDocument, options);
      }
export function useGetCompaniesInfoOnProductCompanyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>(GetCompaniesInfoOnProductCompanyDocument, options);
        }
export function useGetCompaniesInfoOnProductCompanySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>(GetCompaniesInfoOnProductCompanyDocument, options);
        }
export type GetCompaniesInfoOnProductCompanyQueryHookResult = ReturnType<typeof useGetCompaniesInfoOnProductCompanyQuery>;
export type GetCompaniesInfoOnProductCompanyLazyQueryHookResult = ReturnType<typeof useGetCompaniesInfoOnProductCompanyLazyQuery>;
export type GetCompaniesInfoOnProductCompanySuspenseQueryHookResult = ReturnType<typeof useGetCompaniesInfoOnProductCompanySuspenseQuery>;
export type GetCompaniesInfoOnProductCompanyQueryResult = Apollo.QueryResult<GetCompaniesInfoOnProductCompanyQuery, GetCompaniesInfoOnProductCompanyQueryVariables>;