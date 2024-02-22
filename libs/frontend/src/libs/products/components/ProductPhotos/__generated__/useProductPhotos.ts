import * as Types from '@darun/provider-graphql';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloSSRHooks from '@apollo/experimental-nextjs-app-support/ssr';
const defaultOptions = {} as const;
export type GetPhotosOnProductPhotosQueryVariables = Types.Exact<{
  slug: Types.Scalars['String']['input'];
}>;


export type GetPhotosOnProductPhotosQuery = { __typename?: 'Query', productBySlug?: { __typename?: 'Product', id: string, screenshots: Array<{ __typename?: 'Screenshot', imageUrl: string, imageAlt: string }> } | null };


export const GetPhotosOnProductPhotosDocument = gql`
    query GetPhotosOnProductPhotos($slug: String!) {
  productBySlug(slug: $slug) {
    id
    screenshots {
      imageUrl
      imageAlt
    }
  }
}
    `;

/**
 * __useGetPhotosOnProductPhotosQuery__
 *
 * To run a query within a React component, call `useGetPhotosOnProductPhotosQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPhotosOnProductPhotosQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPhotosOnProductPhotosQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetPhotosOnProductPhotosQuery(baseOptions: Apollo.QueryHookOptions<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables> & ({ variables: GetPhotosOnProductPhotosQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloSSRHooks.useQuery<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>(GetPhotosOnProductPhotosDocument, options);
      }
export function useGetPhotosOnProductPhotosLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>(GetPhotosOnProductPhotosDocument, options);
        }
export function useGetPhotosOnProductPhotosSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloSSRHooks.useSuspenseQuery<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>(GetPhotosOnProductPhotosDocument, options);
        }
export type GetPhotosOnProductPhotosQueryHookResult = ReturnType<typeof useGetPhotosOnProductPhotosQuery>;
export type GetPhotosOnProductPhotosLazyQueryHookResult = ReturnType<typeof useGetPhotosOnProductPhotosLazyQuery>;
export type GetPhotosOnProductPhotosSuspenseQueryHookResult = ReturnType<typeof useGetPhotosOnProductPhotosSuspenseQuery>;
export type GetPhotosOnProductPhotosQueryResult = Apollo.QueryResult<GetPhotosOnProductPhotosQuery, GetPhotosOnProductPhotosQueryVariables>;