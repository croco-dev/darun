import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductBySlugOnProductCompanyQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductCompanyQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, ownedCompany?: { __typename?: 'Company', id: string, name: string, type: string, region: string, address: string, size: string, startAt: any } | null } | null };


export const ProductBySlugOnProductCompanyDocument = gql`
    query ProductBySlugOnProductCompany($slug: String!) {
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
 * __useProductBySlugOnProductCompanyQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductCompanyQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductCompanyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductCompanyQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductCompanyQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables> & ({ variables: ProductBySlugOnProductCompanyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>(ProductBySlugOnProductCompanyDocument, options);
      }
export function useProductBySlugOnProductCompanyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>(ProductBySlugOnProductCompanyDocument, options);
        }
export function useProductBySlugOnProductCompanySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>(ProductBySlugOnProductCompanyDocument, options);
        }
export type ProductBySlugOnProductCompanyQueryHookResult = ReturnType<typeof useProductBySlugOnProductCompanyQuery>;
export type ProductBySlugOnProductCompanyLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductCompanyLazyQuery>;
export type ProductBySlugOnProductCompanySuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductCompanySuspenseQuery>;
export type ProductBySlugOnProductCompanyQueryResult = Apollo.QueryResult<ProductBySlugOnProductCompanyQuery, ProductBySlugOnProductCompanyQueryVariables>;