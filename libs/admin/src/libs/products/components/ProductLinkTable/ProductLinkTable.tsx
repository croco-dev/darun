import { bind } from '@croco/utils-structure-react';
import { Button, Group, rem, Table, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import styles from './ProductFeatureTable.module.css';
import { useProductLinkTable } from './useProductLinkTable';

export const ProductLinkTable = bind(useProductLinkTable, ({ links }) => {
  if (!links) {
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
            <Table.Th style={{ width: '80px', textAlign: 'center' }}>아이콘</Table.Th>
            <Table.Th>이름</Table.Th>
            <Table.Th>링크</Table.Th>
            <Table.Th>주 링크 여부</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {links.map(link => (
            <Table.Tr key={link.id} className={styles.table_row}>
              <Table.Td>
                <div
                  style={{
                    background: link.isPrimary ? '#000' : '#fff',
                  }}
                  className={styles.link_icon_wrapper}
                >
                  <img src={link.iconUrl} />
                </div>
              </Table.Td>
              <Table.Td>
                <Text fz="sm" fw={500}>
                  {link.title}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="sm" fw={500}>
                  <a href={link.link} target="_blank">
                    {link.displayLink} ({link.link})
                  </a>
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="sm" fw={500}>
                  {link.isPrimary ? '✅' : '❌'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={0} justify="flex-end">
                  <Button
                    justify="center"
                    leftSection={<IconPencil style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                    variant="default"
                    size={'compact-xs'}
                    disabled
                  >
                    정보 수정 (준비중)
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
