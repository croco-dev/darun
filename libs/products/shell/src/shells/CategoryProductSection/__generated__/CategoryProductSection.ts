import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductsByCategoryOnSectionQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type ProductsByCategoryOnSectionQuery = { __typename?: 'Query', productsByCategory: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> };


export const ProductsByCategoryOnSectionDocument = gql`
    query ProductsByCategoryOnSection($slug: String!, $locale: String!) {
  productsByCategory(slug: $slug, locale: $locale) {
    id
    name
    slug
    logoUrl
    summary
    voteCount
    tags {
      id
      name
    }
  }
}
    `;

/**
 * __useProductsByCategoryOnSectionQuery__
 *
 * To run a query within a React component, call `useProductsByCategoryOnSectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductsByCategoryOnSectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductsByCategoryOnSectionQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useProductsByCategoryOnSectionQuery(baseOptions: Apollo.QueryHookOptions<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables> & ({ variables: ProductsByCategoryOnSectionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>(ProductsByCategoryOnSectionDocument, options);
      }
export function useProductsByCategoryOnSectionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>(ProductsByCategoryOnSectionDocument, options);
        }
export function useProductsByCategoryOnSectionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>(ProductsByCategoryOnSectionDocument, options);
        }
export type ProductsByCategoryOnSectionQueryHookResult = ReturnType<typeof useProductsByCategoryOnSectionQuery>;
export type ProductsByCategoryOnSectionLazyQueryHookResult = ReturnType<typeof useProductsByCategoryOnSectionLazyQuery>;
export type ProductsByCategoryOnSectionSuspenseQueryHookResult = ReturnType<typeof useProductsByCategoryOnSectionSuspenseQuery>;
export type ProductsByCategoryOnSectionQueryResult = Apollo.QueryResult<ProductsByCategoryOnSectionQuery, ProductsByCategoryOnSectionQueryVariables>;