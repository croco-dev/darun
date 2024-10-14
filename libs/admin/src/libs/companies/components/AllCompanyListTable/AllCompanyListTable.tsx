'use client';

import { bind } from '@croco/utils-structure-react';
import { Flex } from '@mantine/core';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import { useAllCompanyListTable } from './useAllCompanyListTable';

export const AllCompanyListTable = bind(
  useAllCompanyListTable,
  ({ companies, totalCount, totalPages, page, handlePage }) => (
    <Flex direction={'column'} gap="12px">
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped={'even'}
        highlightOnHover
        records={companies}
        idAccessor="slug"
        columns={dataTableColumns}
        totalRecords={totalCount}
        onPageChange={handlePage}
        recordsPerPage={50}
        page={page}
      />
    </Flex>
  )
);

const dataTableColumns: DataTableColumn<{
  id: string;
  name: string;
  type: string;
  address: string;
  startAt: Date;
}>[] = [
  { accessor: 'name', title: '이름' },
  { accessor: 'type', title: '유형' },
  { accessor: 'address', title: '주소' },
  { accessor: 'startAt', title: '설립년도' },
];
