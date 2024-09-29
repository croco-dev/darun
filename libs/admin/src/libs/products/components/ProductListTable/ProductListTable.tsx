'use client';

import { bind } from '@croco/utils-structure-react';
import { Button, Flex, Group, Paper, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import Image from 'next/image';
import { useProductListTable } from './useProductListTable';

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

const dataTableColumns: DataTableColumn<{
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
