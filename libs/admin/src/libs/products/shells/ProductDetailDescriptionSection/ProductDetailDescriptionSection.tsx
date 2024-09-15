import { bind } from '@croco/utils-structure-react';
import { Button, Card, Group, Modal, Stack, Title } from '@mantine/core';
import { ProductDescription } from '@products/components';
import { IconPencil } from '@tabler/icons-react';
import { Suspense } from 'react';
import { EditProductDescription } from '../../components/EditProductDescription';
import { useProductDetailDescriptionSection } from './useProductDetailDescriptionSection';

export const ProductDetailDescriptionSection = bind(
  useProductDetailDescriptionSection,
  ({ slug, isEditModalOpened, openEditModal, closeEditModal }) => (
    <>
      <Stack gap={8}>
        <Group justify={'space-between'}>
          <Title order={3}>설명</Title>
          <Button
            onClick={openEditModal}
            color={'dark'}
            variant={'light'}
            leftSection={<IconPencil size={16} />}
            size={'xs'}
          >
            수정
          </Button>
        </Group>
        <Card withBorder shadow="sm" radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Suspense fallback={<>로딩 중...</>}>
              <ProductDescription slug={slug} />
            </Suspense>
          </Card.Section>
        </Card>
      </Stack>
      <Modal opened={isEditModalOpened} onClose={closeEditModal} title="설명 수정" centered size="xl">
        <EditProductDescription slug={slug} onSubmit={closeEditModal} />
      </Modal>
    </>
  )
);
