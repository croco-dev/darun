'use client';

import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query AllCompaniesOnAllCompanyListTable($page: Int!) {
    allCompanies(page: $page) {
      totalCount
      totalPages
      companies {
        id
        name
        type
        address
        startAt
      }
    }
  }
`;

export function useAllCompanyListTable() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useQuery(AllCompaniesOnAllCompanyListTableDocument, {
    variables: { page },
  });

  const handlePage = (p: number) => {
    setPage(p);
  };

  return {
    companies: data?.allCompanies.companies,
    handlePage,
    page,
    totalCount: data?.allCompanies.totalCount,
    totalPages: data?.allCompanies.totalPages,
    loading,
    error,
    refetch,
  };
}
