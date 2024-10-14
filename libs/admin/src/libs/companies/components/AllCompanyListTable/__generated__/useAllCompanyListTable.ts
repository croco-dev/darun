import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type AllCompaniesOnAllCompanyListTableQueryVariables = Types.Exact<{
  page: Types.Scalars['Int']['input'];
}>;


export type AllCompaniesOnAllCompanyListTableQuery = { __typename?: 'Query', allCompanies: { __typename?: 'CompanyPagination', totalCount: number, totalPages: number, companies: Array<{ __typename?: 'Company', id: string, name: string, type: string, address: string, startAt: any }> } };


export const AllCompaniesOnAllCompanyListTableDocument = gql`
    query AllCompaniesOnAllCompanyListTable($page: Int!) {
  allCompanies(page: $page) {
    totalCount
    totalPages
    companies {
      id
      name
      type
      address
      startAt
    }
  }
}
    `;

/**
 * __useAllCompaniesOnAllCompanyListTableQuery__
 *
 * To run a query within a React component, call `useAllCompaniesOnAllCompanyListTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllCompaniesOnAllCompanyListTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllCompaniesOnAllCompanyListTableQuery({
 *   variables: {
 *      page: // value for 'page'
 *   },
 * });
 */
export function useAllCompaniesOnAllCompanyListTableQuery(baseOptions: Apollo.QueryHookOptions<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables> & ({ variables: AllCompaniesOnAllCompanyListTableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>(AllCompaniesOnAllCompanyListTableDocument, options);
      }
export function useAllCompaniesOnAllCompanyListTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>(AllCompaniesOnAllCompanyListTableDocument, options);
        }
export function useAllCompaniesOnAllCompanyListTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>(AllCompaniesOnAllCompanyListTableDocument, options);
        }
export type AllCompaniesOnAllCompanyListTableQueryHookResult = ReturnType<typeof useAllCompaniesOnAllCompanyListTableQuery>;
export type AllCompaniesOnAllCompanyListTableLazyQueryHookResult = ReturnType<typeof useAllCompaniesOnAllCompanyListTableLazyQuery>;
export type AllCompaniesOnAllCompanyListTableSuspenseQueryHookResult = ReturnType<typeof useAllCompaniesOnAllCompanyListTableSuspenseQuery>;
export type AllCompaniesOnAllCompanyListTableQueryResult = Apollo.QueryResult<AllCompaniesOnAllCompanyListTableQuery, AllCompaniesOnAllCompanyListTableQueryVariables>;