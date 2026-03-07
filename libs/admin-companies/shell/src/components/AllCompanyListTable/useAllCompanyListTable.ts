import { gql } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useAllCompaniesOnAllCompanyListTableLazyQuery } from './__generated__/useAllCompanyListTable';

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
  const [tableQuery, { data }] = useAllCompaniesOnAllCompanyListTableLazyQuery();

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
  };
}
