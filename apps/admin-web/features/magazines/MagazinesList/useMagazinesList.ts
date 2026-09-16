'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { TempAllMagazinesOnMagazinesListDocument } from '@darun/provider-graphql';
import { useState } from 'react';

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
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useQuery(TempAllMagazinesOnMagazinesListDocument, {
    variables: { page },
  });

  return {
    magazines: data?.tempAllMagazines.magazines ?? [],
    page,
    setPage,
    totalCount: data?.tempAllMagazines.totalCount ?? 0,
    totalPages: data?.tempAllMagazines.totalPages ?? 1,
    loading,
    error,
    refetch,
  };
}
