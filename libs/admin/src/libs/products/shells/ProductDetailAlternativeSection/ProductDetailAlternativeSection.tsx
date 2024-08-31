import { bind } from '@croco/utils-structure-react';
import { Button, Card, Group, Modal, Stack, Title } from '@mantine/core';
import { EditAlternativeProducts } from '../../components/EditAlternativeProducts';
import { useProductDetailAlternativeSection } from './useProductDetailAlternativeSection';

export const ProductDetailAlternativeSection = bind(
  useProductDetailAlternativeSection,
  ({ slug, isEditModalOpened, closeEditModal, openEditModal }) => (
    <>
      <Stack gap={8}>
        <Group justify={'space-between'}>
          <Title order={3}>다른 서비스 관리</Title>
          <Button onClick={openEditModal} color={'dark'}>
            다른 서비스 추가
          </Button>
        </Group>
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            준비중
          </Card.Section>
        </Card>
      </Stack>
      <Modal opened={isEditModalOpened} onClose={closeEditModal} title="설명 수정" centered>
        <EditAlternativeProducts slug={slug} onSubmit={closeEditModal} />
      </Modal>
    </>
  )
);
