import { bind } from '@croco/utils-structure-react';
import { Button, Group, rem, Table, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import styles from './ProductFeatureTable.module.css';
import { useProductFeatureTable } from './useProductFeatureTable';

const data = [
  {
    emoji: '👒',
    name: 'asdads',
    summary: 'asdads',
  },
];

const rolesData = ['Manager', 'Collaborator', 'Contractor'];

export const ProductFeatureTable = bind(useProductFeatureTable, ({ features, loading, editFeature }) => {
  if (loading) {
    return <>로딩 중...</>;
  }

  if (!features) {
    return (
      <Text fz="sm" fw={500} c={'gray'}>
        기능이 한 개도 없습니다.
      </Text>
    );
  }

  return (
    <Table.ScrollContainer minWidth={'300px'}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '60px' }}>이모지</Table.Th>
            <Table.Th>이름</Table.Th>
            <Table.Th>설명</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {features.map((feature, i) => (
            <Table.Tr key={feature.name} className={styles.table_row}>
              <Table.Td>
                <div style={{ textAlign: 'center' }}>
                  <Text fw={500} p={1}>
                    {feature.emoji}
                  </Text>
                </div>
              </Table.Td>
              <Table.Td>
                <Text fz="sm" fw={500}>
                  {feature.name}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="sm" fw={500}>
                  {feature.summary}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={0} justify="flex-end">
                  <Button
                    justify="center"
                    leftSection={<IconPencil style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                    variant="default"
                    size={'compact-xs'}
                    onClick={() => editFeature(feature.id)}
                  >
                    정보 수정
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
});
