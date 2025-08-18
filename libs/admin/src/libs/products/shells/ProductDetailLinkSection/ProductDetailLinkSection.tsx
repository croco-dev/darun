import { bind } from '@croco/utils-structure-react';
import { Button, Card, Group, Modal, Stack, Title, Text } from '@mantine/core';
import Link from 'next/link';
import { ProductLinkTable } from '../../components/ProductLinkTable';
import { useProductDetailLinkSection } from './useProductDetailLinkSection';
import { EditProductLinkItem } from '../../components/EditProductLinkItem';

export const ProductDetailLinkSection = bind(
  useProductDetailLinkSection,
  ({ slug, isEditModalOpened, closeEditModal, editLink, link }) => (
    <>
      <Stack gap={8}>
        <Group justify={'space-between'}>
          <Stack gap={0}>
            <Title order={3}>링크 관리</Title>
            <Text c="dimmed" fw={500} size="sm">
              서비스 정보에서 목차 위에 표시되는 링크 버튼에 뜨는 버튼들을 관리합니다.
            </Text>
          </Stack>
          <Link href={`/products/${slug}/links/new`}>
            <Button color={'dark'}>새 링크 추가</Button>
          </Link>
        </Group>
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <ProductLinkTable slug={slug} editLink={editLink} />
          </Card.Section>
        </Card>
      </Stack>
      <Modal opened={isEditModalOpened} onClose={closeEditModal} title="링크 정보 수정" centered>
        {link ? <EditProductLinkItem slug={slug} link={link} onSubmit={closeEditModal} /> : <>오류 발생. 새로고침 후 시도.</>}
      </Modal>
    </>
  )
);
