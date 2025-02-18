import { gql } from '@apollo/client';
import { useTempAllMagazinesOnMagazinesListQuery } from './__generated__/useMagazinesList';

export function useMagazinesList() {
  const { data, loading, error } = useTempAllMagazinesOnMagazinesListQuery({ variables: { page: 1 } });
  return { data: data?.tempAllMagazines.magazines, isLoading: loading, isError: !!error };
}

gql`
  query TempAllMagazinesOnMagazinesList($page: Int!) {
    tempAllMagazines(page: $page) {
      totalCount
      totalPages
      magazines {
        id
        slug
        title
        description
        backgroundImageUrl
        updatedAt
        publishedAt
      }
    }
  }
`;
