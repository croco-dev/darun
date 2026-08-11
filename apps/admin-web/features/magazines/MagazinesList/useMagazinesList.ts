import { gql } from '@apollo/client';
import { useSuspenseQuery } from '@apollo/client/react';
import { TempAllMagazinesOnMagazinesListDocument } from '@darun/provider-graphql';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
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

export function useMagazinesList() {
  const { data } = useSuspenseQuery(TempAllMagazinesOnMagazinesListDocument, {
    variables: { page: 1 },
  });

  return { magazines: data?.tempAllMagazines.magazines ?? [] };
}
