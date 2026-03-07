'use client';

import { bind } from '@croco/utils-structure-react';
import { Flex } from '@mantine/core';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { useAllCompanyListTable } from './useAllCompanyListTable';

type CompanyRecord = {
  id: string;
  name: string;
  type: string;
  address: string;
  startAt?: string | Date | null;
};

function formatStartAt(startAt: unknown) {
  if (!startAt) {
    return '-';
  }

  if (typeof startAt !== 'string' && typeof startAt !== 'number' && !(startAt instanceof Date)) {
    return '-';
  }

  const date = startAt instanceof Date ? startAt : new Date(startAt);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

export const AllCompanyListTable = bind(useAllCompanyListTable, ({ companies, totalCount, page, handlePage }) => (
  <Flex direction={'column'} gap="12px">
    <DataTable
      withTableBorder
      borderRadius="sm"
      withColumnBorders
      striped={'even'}
      highlightOnHover
      records={(companies ?? []) as CompanyRecord[]}
      idAccessor="id"
      columns={dataTableColumns}
      totalRecords={totalCount ?? 0}
      onPageChange={handlePage}
      recordsPerPage={50}
      page={page}
    />
  </Flex>
));

const dataTableColumns: DataTableColumn<CompanyRecord>[] = [
  { accessor: 'id', title: 'ID' },
  { accessor: 'name', title: '이름' },
  { accessor: 'type', title: '유형' },
  { accessor: 'address', title: '주소' },
  {
    accessor: 'startAt',
    title: '설립년도',
    render: ({ startAt }) => formatStartAt(startAt),
  },
];
