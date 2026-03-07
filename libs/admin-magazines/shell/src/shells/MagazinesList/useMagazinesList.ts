import { gql } from '@apollo/client';
import { useTempAllMagazinesOnMagazinesListSuspenseQuery } from './__generated__/useMagazinesList';

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
  const { data } = useTempAllMagazinesOnMagazinesListSuspenseQuery({
    variables: { page: 1 },
  });

  return { magazines: data?.tempAllMagazines.magazines ?? [] };
}
