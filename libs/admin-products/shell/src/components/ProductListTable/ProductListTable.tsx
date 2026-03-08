'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import Image from 'next/image';
import { useProductListTable } from './useProductListTable';

import { bind } from '@croco/utils-structure-react';
import { Button, Flex, Group, Paper, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import Image from 'next/image';
import { useProductListTable } from './useProductListTable';

type Product = {
  id: string;
  logoUrl: string;
  name: string;
  summary: string;
  slug: string;
};

const columnHelper = createColumnHelper<Product>();

const columns = [
  columnHelper.accessor('logoUrl', {
    header: '로고',
    cell: info => (
      <Image
        src={info.getValue()}
        unoptimized={!info.getValue()}
        alt={`서비스 로고`}
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg border border-black/15 object-contain"
      />
    ),
  }),
  columnHelper.accessor('name', {
    header: '이름',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('summary', {
    header: '요약',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('slug', {
    header: '슬러그',
    cell: info => <span className="text-sm text-dark-900">{info.getValue()}</span>,
  }),
];

export const ProductListTable = bind(
  useProductListTable,
  ({
    products,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    pageCount,
    loadNextPage,
    loadPreviousPage,
    handleRowClick,
  }) => {
    const table = useReactTable({
      data: products.map(product => product.node),
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-black/10">
          <table className="w-full border-collapse">
            <thead className="bg-dark-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="border-b border-r border-black/10 px-4 py-3 text-left text-sm font-medium text-dark-900 last:border-r-0"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={`cursor-pointer border-b border-black/10 transition hover:bg-dark-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-dark-50/30'
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="border-r border-black/10 px-4 py-3 text-sm text-dark-900 last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 rounded-xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-dark-900">
              {totalCount}개의 서비스 중 {pageCount}개부터 표시합니다.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                startIcon={<ChevronLeft className="h-4 w-4" />}
                disabled={!hasPreviousPage}
                onClick={loadPreviousPage}
              >
                이전
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                startIcon={<ChevronRight className="h-4 w-4" />}
                disabled={!hasNextPage}
                onClick={loadNextPage}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
  useProductListTable,
  ({
    products,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    pageCount,
    loadNextPage,
    loadPreviousPage,
    handleRowClick,
  }) => (
    <Flex direction={'column'} gap="12px">
      <DataTable
        withTableBorder
        borderRadius="sm"
        withColumnBorders
        striped={'even'}
        highlightOnHover
        // provide data
        records={products.map(product => product.node)}
        idAccessor="slug"
        columns={dataTableColumns}
        onRowClick={handleRowClick}
      />
      <Paper p="md" mt="sm" withBorder>
        <Group justify="space-between">
          <Text size="sm">
            {totalCount}개의 서비스 중 {pageCount}개부터 표시합니다.
          </Text>
          <Button.Group>
            <Button
              variant="default"
              leftSection={<IconChevronLeft size={14} />}
              disabled={!hasPreviousPage}
              onClick={loadPreviousPage}
            >
              이전
            </Button>
            <Button
              variant="default"
              leftSection={<IconChevronRight size={14} />}
              disabled={!hasNextPage}
              onClick={loadNextPage}
            >
              다음
            </Button>
          </Button.Group>
        </Group>
      </Paper>
    </Flex>
  )
);


  id: string;
  logoUrl: string;
  name: string;
  summary: string;
  slug: string;
}>[] = [
  {
    accessor: 'logoUrl',
    title: '로고',
    render: ({ logoUrl }) => (
      <Image
        src={logoUrl}
        unoptimized={!logoUrl}
        alt={`서비스 로고`}
        width={32}
        height={32}
        style={{
          objectFit: 'contain',
          borderRadius: 8,
          border: '1px solid rgba(0, 0, 0, 0.15)',
        }}
      />
    ),
  },
  { accessor: 'name', title: '이름' },
  { accessor: 'summary', title: '요약' },
  {
    accessor: 'slug',
    title: '슬러그',
    render: ({ slug }) => <Text>{slug}</Text>,
  },
];
