'use client';

import { bind } from '@croco/utils-structure-react';
import { Table } from '@mantine/core';
import { useProductListTable } from './useProductListTable';

export const ProductListTable = bind(useProductListTable, () => (
  <Table>
    <Table.Thead>
      <Table.Tr>
        <Table.Th>Element position</Table.Th>
        <Table.Th>Element name</Table.Th>
        <Table.Th>Symbol</Table.Th>
        <Table.Th>Atomic mass</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {Array.from({ length: 10 }).map((_, index) => (
        <Table.Tr key={index}>
          <Table.Td>{index}</Table.Td>
          <Table.Td>{index}</Table.Td>
          <Table.Td>{index}</Table.Td>
          <Table.Td>{index}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
));
