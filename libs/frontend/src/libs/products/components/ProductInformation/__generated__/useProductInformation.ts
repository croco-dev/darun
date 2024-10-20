import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductBySlugOnProductInformationQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnProductInformationQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, name: string, summary: string, description?: string | null, logoUrl: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }> } | null };


export const ProductBySlugOnProductInformationDocument = gql`
    query ProductBySlugOnProductInformation($slug: String!) {
  productBySlug(slug: $slug) {
    id
    name
    summary
    description
    logoUrl
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useProductBySlugOnProductInformationQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnProductInformationQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnProductInformationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnProductInformationQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnProductInformationQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables> & ({ variables: ProductBySlugOnProductInformationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>(ProductBySlugOnProductInformationDocument, options);
      }
export function useProductBySlugOnProductInformationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>(ProductBySlugOnProductInformationDocument, options);
        }
export function useProductBySlugOnProductInformationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>(ProductBySlugOnProductInformationDocument, options);
        }
export type ProductBySlugOnProductInformationQueryHookResult = ReturnType<typeof useProductBySlugOnProductInformationQuery>;
export type ProductBySlugOnProductInformationLazyQueryHookResult = ReturnType<typeof useProductBySlugOnProductInformationLazyQuery>;
export type ProductBySlugOnProductInformationSuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnProductInformationSuspenseQuery>;
export type ProductBySlugOnProductInformationQueryResult = Apollo.QueryResult<ProductBySlugOnProductInformationQuery, ProductBySlugOnProductInformationQueryVariables>;