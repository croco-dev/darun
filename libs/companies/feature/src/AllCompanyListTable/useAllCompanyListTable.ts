import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { AllCompaniesOnAllCompanyListTableDocument } from '@darun/provider-graphql';
import { useEffect, useState } from 'react';

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
  const [tableQuery, { data, loading, error }] = useLazyQuery(AllCompaniesOnAllCompanyListTableDocument);

  const handlePage = (p: number) => {
    setPage(p);
  };

  useEffect(() => {
    if (page) {
      tableQuery({ variables: { page } });
    }
  }, [page, tableQuery]);

  return {
    companies: data?.allCompanies.companies,
    handlePage,
    page,
    totalCount: data?.allCompanies.totalCount,
    totalPages: data?.allCompanies.totalPages,
    loading,
    error,
  };
}
