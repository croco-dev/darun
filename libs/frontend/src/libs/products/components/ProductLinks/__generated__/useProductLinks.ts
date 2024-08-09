import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ProductOnProductLinksQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductOnProductLinksQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, links: Array<{ __typename?: 'Link', id: string, displayLink: string, link: string, title: string, iconUrl: string }> } | null };


export const ProductOnProductLinksDocument = gql`
    query ProductOnProductLinks($slug: String!) {
  productBySlug(slug: $slug) {
    id
    links {
      id
      displayLink
      link
      title
      iconUrl
    }
  }
}
    `;

/**
 * __useProductOnProductLinksQuery__
 *
 * To run a query within a React component, call `useProductOnProductLinksQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductOnProductLinksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductOnProductLinksQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductOnProductLinksQuery(baseOptions: Apollo.QueryHookOptions<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables> & ({ variables: ProductOnProductLinksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>(ProductOnProductLinksDocument, options);
      }
export function useProductOnProductLinksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>(ProductOnProductLinksDocument, options);
        }
export function useProductOnProductLinksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>(ProductOnProductLinksDocument, options);
        }
export type ProductOnProductLinksQueryHookResult = ReturnType<typeof useProductOnProductLinksQuery>;
export type ProductOnProductLinksLazyQueryHookResult = ReturnType<typeof useProductOnProductLinksLazyQuery>;
export type ProductOnProductLinksSuspenseQueryHookResult = ReturnType<typeof useProductOnProductLinksSuspenseQuery>;
export type ProductOnProductLinksQueryResult = Apollo.QueryResult<ProductOnProductLinksQuery, ProductOnProductLinksQueryVariables>;