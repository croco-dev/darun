import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductBySlugOnAlternativeProductListQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductBySlugOnAlternativeProductListQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, alternatives: Array<{ __typename?: 'Product', id: string, name: string, slug: string, summary: string, logoUrl: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> } | null };


export const ProductBySlugOnAlternativeProductListDocument = gql`
    query ProductBySlugOnAlternativeProductList($slug: String!) {
  productBySlug(slug: $slug) {
    id
    alternatives {
      id
      name
      slug
      summary
      logoUrl
      tags {
        id
        name
      }
    }
  }
}
    `;

/**
 * __useProductBySlugOnAlternativeProductListQuery__
 *
 * To run a query within a React component, call `useProductBySlugOnAlternativeProductListQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductBySlugOnAlternativeProductListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductBySlugOnAlternativeProductListQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductBySlugOnAlternativeProductListQuery(baseOptions: Apollo.QueryHookOptions<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables> & ({ variables: ProductBySlugOnAlternativeProductListQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>(ProductBySlugOnAlternativeProductListDocument, options);
      }
export function useProductBySlugOnAlternativeProductListLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>(ProductBySlugOnAlternativeProductListDocument, options);
        }
export function useProductBySlugOnAlternativeProductListSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>(ProductBySlugOnAlternativeProductListDocument, options);
        }
export type ProductBySlugOnAlternativeProductListQueryHookResult = ReturnType<typeof useProductBySlugOnAlternativeProductListQuery>;
export type ProductBySlugOnAlternativeProductListLazyQueryHookResult = ReturnType<typeof useProductBySlugOnAlternativeProductListLazyQuery>;
export type ProductBySlugOnAlternativeProductListSuspenseQueryHookResult = ReturnType<typeof useProductBySlugOnAlternativeProductListSuspenseQuery>;
export type ProductBySlugOnAlternativeProductListQueryResult = Apollo.QueryResult<ProductBySlugOnAlternativeProductListQuery, ProductBySlugOnAlternativeProductListQueryVariables>;