'use client';

import { Button } from '@darun/ui';
import { AdminPanel, AdminEmptyState } from '@darun/ui-admin';
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    size: 70,
    cell: info => (
      <div className="flex justify-center">
        <Image
          src={info.getValue()}
          unoptimized={!info.getValue()}
          alt={`서비스 로고`}
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg border border-black/15 object-contain"
        />
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: '이름',
    size: 200,
    cell: info => (
      <div className="truncate font-medium text-dark-900" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('summary', {
    header: '요약',
    cell: info => (
      <div className="truncate text-dark-500" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('slug', {
    header: '슬러그',
    size: 150,
    cell: info => (
      <div className="truncate text-sm text-dark-500" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
];

export function ProductListTable() {
  const {
    products,
    totalCount,
    hasPreviousPage,
    hasNextPage,
    pageCount,
    loadNextPage,
    loadPreviousPage,
    handleRowClick,
  } = useProductListTable();

  const table = useReactTable({
    data: products.map(product => product.node),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (products.length === 0) {
    return (
      <AdminPanel className="p-8">
        <AdminEmptyState title="등록된 서비스가 없습니다." description="새로운 서비스를 추가해보세요." />
      </AdminPanel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AdminPanel className="overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <thead className="bg-dark-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="border-b border-r border-dark-200 px-4 py-3 text-left text-sm font-medium text-dark-900 last:border-r-0"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => handleRowClick({ record: row.original })}
                className={`cursor-pointer border-b border-dark-200 transition hover:bg-dark-50 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-dark-50/30'
                }`}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="border-r border-dark-200 px-4 py-3 text-sm text-dark-900 last:border-r-0"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </AdminPanel>
      <AdminPanel className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-dark-900">
            {totalCount}개의 서비스 중 {pageCount}개부터 표시합니다.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="base" size="sm" disabled={!hasPreviousPage} onClick={loadPreviousPage}>
              <span className="inline-flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                이전
              </span>
            </Button>
            <Button type="button" variant="base" size="sm" disabled={!hasNextPage} onClick={loadNextPage}>
              <span className="inline-flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                다음
              </span>
            </Button>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
