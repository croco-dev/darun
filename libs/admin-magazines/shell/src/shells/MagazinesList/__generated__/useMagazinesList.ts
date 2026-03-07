import * as Types from "@darun/provider-graphql";

import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
const defaultOptions = {} as const;
export type TempAllMagazinesOnMagazinesListQueryVariables = Types.Exact<{
  page: Types.Scalars["Int"]["input"];
}>;

export type TempAllMagazinesOnMagazinesListQuery = {
  __typename?: "Query";
  tempAllMagazines: {
    __typename?: "MagazinePagination";
    totalCount: number;
    totalPages: number;
    magazines: Array<{
      __typename?: "Magazine";
      id: string;
      slug: string;
      title: string;
      summary?: string | null;
      content?: string | null;
      backgroundImageUrl: string;
      updatedAt?: any | null;
      publishedAt?: any | null;
      author?: { __typename?: "Author"; id: string; name: string } | null;
    }>;
  };
};

export const TempAllMagazinesOnMagazinesListDocument = gql`
  query TempAllMagazinesOnMagazinesList($page: Int!) {
    tempAllMagazines(page: $page) {
      totalCount
      totalPages
      magazines {
        id
        slug
        title
        summary
        content
        backgroundImageUrl
        updatedAt
        publishedAt
        author {
          id
          name
        }
      }
    }
  }
`;

/**
 * __useTempAllMagazinesOnMagazinesListQuery__
 *
 * To run a query within a React component, call `useTempAllMagazinesOnMagazinesListQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempAllMagazinesOnMagazinesListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempAllMagazinesOnMagazinesListQuery({
 *   variables: {
 *      page: // value for 'page'
 *   },
 * });
 */
export function useTempAllMagazinesOnMagazinesListQuery(
  baseOptions: Apollo.QueryHookOptions<
    TempAllMagazinesOnMagazinesListQuery,
    TempAllMagazinesOnMagazinesListQueryVariables
  > &
    (
      | {
          variables: TempAllMagazinesOnMagazinesListQueryVariables;
          skip?: boolean;
        }
      | { skip: boolean }
    ),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    TempAllMagazinesOnMagazinesListQuery,
    TempAllMagazinesOnMagazinesListQueryVariables
  >(TempAllMagazinesOnMagazinesListDocument, options);
}
export function useTempAllMagazinesOnMagazinesListLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    TempAllMagazinesOnMagazinesListQuery,
    TempAllMagazinesOnMagazinesListQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    TempAllMagazinesOnMagazinesListQuery,
    TempAllMagazinesOnMagazinesListQueryVariables
  >(TempAllMagazinesOnMagazinesListDocument, options);
}
export function useTempAllMagazinesOnMagazinesListSuspenseQuery(
  baseOptions?:
    | Apollo.SkipToken
    | Apollo.SuspenseQueryHookOptions<
        TempAllMagazinesOnMagazinesListQuery,
        TempAllMagazinesOnMagazinesListQueryVariables
      >,
) {
  const options =
    baseOptions === Apollo.skipToken
      ? baseOptions
      : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<
    TempAllMagazinesOnMagazinesListQuery,
    TempAllMagazinesOnMagazinesListQueryVariables
  >(TempAllMagazinesOnMagazinesListDocument, options);
}
export type TempAllMagazinesOnMagazinesListQueryHookResult = ReturnType<
  typeof useTempAllMagazinesOnMagazinesListQuery
>;
export type TempAllMagazinesOnMagazinesListLazyQueryHookResult = ReturnType<
  typeof useTempAllMagazinesOnMagazinesListLazyQuery
>;
export type TempAllMagazinesOnMagazinesListSuspenseQueryHookResult = ReturnType<
  typeof useTempAllMagazinesOnMagazinesListSuspenseQuery
>;
export type TempAllMagazinesOnMagazinesListQueryResult = Apollo.QueryResult<
  TempAllMagazinesOnMagazinesListQuery,
  TempAllMagazinesOnMagazinesListQueryVariables
>;
