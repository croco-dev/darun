'use client';

import { bind } from '@croco/utils-structure-react';
import { Link } from '@darun/utils-router';
import { Table } from '@mantine/core';
import { useProductListTable } from './useProductListTable';

export const ProductListTable = bind(useProductListTable, ({ products }) => (
  <Table>
    <Table.Thead>
      <Table.Tr>
        <Table.Th>slug</Table.Th>
        <Table.Th>name</Table.Th>
        <Table.Th>summary</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {products.map(product => (
        <Table.Tr key={product.cursor}>
          <Table.Td>
            <Link href={`/products/${product.node.slug}`}>{product.node.slug}</Link>
          </Table.Td>
          <Table.Td>{product.node.name}</Table.Td>
          <Table.Td>{product.node.summary}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
));
