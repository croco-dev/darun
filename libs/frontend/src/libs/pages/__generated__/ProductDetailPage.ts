import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductPrimaryInformationQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductPrimaryInformationQuery = { __typename?: 'Query', information?: { __typename?: 'Product', id: string, name: string, summary: string, description?: string | null, logoUrl: string, screenshots: Array<{ __typename?: 'Screenshot', imageUrl: string, imageAlt: string }> } | null };


export const ProductPrimaryInformationDocument = gql`
    query ProductPrimaryInformation($slug: String!) {
  information: productBySlug(slug: $slug) {
    id
    name
    summary
    description
    logoUrl
    screenshots {
      imageUrl
      imageAlt
    }
  }
}
    `;

/**
 * __useProductPrimaryInformationQuery__
 *
 * To run a query within a React component, call `useProductPrimaryInformationQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductPrimaryInformationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductPrimaryInformationQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductPrimaryInformationQuery(baseOptions: Apollo.QueryHookOptions<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables> & ({ variables: ProductPrimaryInformationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>(ProductPrimaryInformationDocument, options);
      }
export function useProductPrimaryInformationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>(ProductPrimaryInformationDocument, options);
        }
export function useProductPrimaryInformationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>(ProductPrimaryInformationDocument, options);
        }
export type ProductPrimaryInformationQueryHookResult = ReturnType<typeof useProductPrimaryInformationQuery>;
export type ProductPrimaryInformationLazyQueryHookResult = ReturnType<typeof useProductPrimaryInformationLazyQuery>;
export type ProductPrimaryInformationSuspenseQueryHookResult = ReturnType<typeof useProductPrimaryInformationSuspenseQuery>;
export type ProductPrimaryInformationQueryResult = Apollo.QueryResult<ProductPrimaryInformationQuery, ProductPrimaryInformationQueryVariables>;