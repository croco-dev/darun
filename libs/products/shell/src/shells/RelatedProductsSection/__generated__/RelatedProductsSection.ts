import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type RelatedProductsQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
  locale: Types.Scalars['String']['input'];
}>;


export type RelatedProductsQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', alternatives: Array<{ __typename?: 'Product', id: string, name: string, slug: string, logoUrl: string, summary: string, voteCount: number, tags: Array<{ __typename?: 'Tag', id: string, name: string }> }> } | null };


export const RelatedProductsDocument = gql`
    query RelatedProducts($slug: String!, $locale: String!) {
  productBySlug(slug: $slug, locale: $locale) {
    alternatives {
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
}
    `;

/**
 * __useRelatedProductsQuery__
 *
 * To run a query within a React component, call `useRelatedProductsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRelatedProductsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRelatedProductsQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useRelatedProductsQuery(baseOptions: Apollo.QueryHookOptions<RelatedProductsQuery, RelatedProductsQueryVariables> & ({ variables: RelatedProductsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RelatedProductsQuery, RelatedProductsQueryVariables>(RelatedProductsDocument, options);
      }
export function useRelatedProductsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RelatedProductsQuery, RelatedProductsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RelatedProductsQuery, RelatedProductsQueryVariables>(RelatedProductsDocument, options);
        }
export function useRelatedProductsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<RelatedProductsQuery, RelatedProductsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<RelatedProductsQuery, RelatedProductsQueryVariables>(RelatedProductsDocument, options);
        }
export type RelatedProductsQueryHookResult = ReturnType<typeof useRelatedProductsQuery>;
export type RelatedProductsLazyQueryHookResult = ReturnType<typeof useRelatedProductsLazyQuery>;
export type RelatedProductsSuspenseQueryHookResult = ReturnType<typeof useRelatedProductsSuspenseQuery>;
export type RelatedProductsQueryResult = Apollo.QueryResult<RelatedProductsQuery, RelatedProductsQueryVariables>;