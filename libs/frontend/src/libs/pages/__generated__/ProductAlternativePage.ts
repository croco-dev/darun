import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type ProductInformationQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type ProductInformationQuery = { __typename?: 'Query', information?: { __typename?: 'Product', id: string, name: string, summary: string, description?: string | null, logoUrl: string } | null };


export const ProductInformationDocument = gql`
    query ProductInformation($slug: String!) {
  information: productBySlug(slug: $slug) {
    id
    name
    summary
    description
    logoUrl
  }
}
    `;

/**
 * __useProductInformationQuery__
 *
 * To run a query within a React component, call `useProductInformationQuery` and pass it any options that fit your needs.
 * When your component renders, `useProductInformationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProductInformationQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useProductInformationQuery(baseOptions: Apollo.QueryHookOptions<ProductInformationQuery, ProductInformationQueryVariables> & ({ variables: ProductInformationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<ProductInformationQuery, ProductInformationQueryVariables>(ProductInformationDocument, options);
      }
export function useProductInformationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProductInformationQuery, ProductInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProductInformationQuery, ProductInformationQueryVariables>(ProductInformationDocument, options);
        }
export function useProductInformationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ProductInformationQuery, ProductInformationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<ProductInformationQuery, ProductInformationQueryVariables>(ProductInformationDocument, options);
        }
export type ProductInformationQueryHookResult = ReturnType<typeof useProductInformationQuery>;
export type ProductInformationLazyQueryHookResult = ReturnType<typeof useProductInformationLazyQuery>;
export type ProductInformationSuspenseQueryHookResult = ReturnType<typeof useProductInformationSuspenseQuery>;
export type ProductInformationQueryResult = Apollo.QueryResult<ProductInformationQuery, ProductInformationQueryVariables>;