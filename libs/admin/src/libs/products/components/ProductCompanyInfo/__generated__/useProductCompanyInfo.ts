import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type TempProductBySlugOnProductCompanyInfoQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type TempProductBySlugOnProductCompanyInfoQuery = { __typename?: 'Query', tempProductBySlug?: { __typename?: 'Product', id: string, ownedCompany?: { __typename?: 'Company', id: string, name: string, type: string, address: string, startAt?: any | null } | null } | null };


export const TempProductBySlugOnProductCompanyInfoDocument = gql`
    query TempProductBySlugOnProductCompanyInfo($slug: String!) {
  tempProductBySlug(slug: $slug) {
    id
    ownedCompany {
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
 * __useTempProductBySlugOnProductCompanyInfoQuery__
 *
 * To run a query within a React component, call `useTempProductBySlugOnProductCompanyInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempProductBySlugOnProductCompanyInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempProductBySlugOnProductCompanyInfoQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useTempProductBySlugOnProductCompanyInfoQuery(baseOptions: Apollo.QueryHookOptions<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables> & ({ variables: TempProductBySlugOnProductCompanyInfoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>(TempProductBySlugOnProductCompanyInfoDocument, options);
      }
export function useTempProductBySlugOnProductCompanyInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>(TempProductBySlugOnProductCompanyInfoDocument, options);
        }
export function useTempProductBySlugOnProductCompanyInfoSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>(TempProductBySlugOnProductCompanyInfoDocument, options);
        }
export type TempProductBySlugOnProductCompanyInfoQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductCompanyInfoQuery>;
export type TempProductBySlugOnProductCompanyInfoLazyQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductCompanyInfoLazyQuery>;
export type TempProductBySlugOnProductCompanyInfoSuspenseQueryHookResult = ReturnType<typeof useTempProductBySlugOnProductCompanyInfoSuspenseQuery>;
export type TempProductBySlugOnProductCompanyInfoQueryResult = Apollo.QueryResult<TempProductBySlugOnProductCompanyInfoQuery, TempProductBySlugOnProductCompanyInfoQueryVariables>;