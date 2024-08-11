import { bind } from '@croco/utils-structure-react';
import { Button, Card, Flex, Group, Modal } from '@mantine/core';
import { IndexProductButton, ProductInfo } from '@products/components';
import { IconPencil } from '@tabler/icons-react';
import { EditProductInfo } from '../../components/EditProductInfo/EditProductInfo';
import { PublishProductButton } from '../../components/PublishProductButton';
import { useProductDetailInfoSection } from './useProductDetailInfoSection';

export const ProductDetailInfoSection = bind(
  useProductDetailInfoSection,
  ({ slug, isEditModalOpened, openEditModal, closeEditModal }) => (
    <>
      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify={'space-between'}>
            <ProductInfo slug={slug} />
          </Group>
        </Card.Section>
        <Card.Section withBorder inheritPadding py="xs">
          <Flex justify={'space-between'}>
            <Group></Group>
            <Group gap={8}>
              <Button
                onClick={openEditModal}
                variant={'light'}
                color={'dark'}
                leftSection={<IconPencil size={16} />}
                size={'compact-sm'}
              >
                기본 정보 수정
              </Button>
              <IndexProductButton slug={slug} />
              <PublishProductButton slug={slug} />
            </Group>
          </Flex>
        </Card.Section>
      </Card>
      <Modal opened={isEditModalOpened} onClose={closeEditModal} title="기본 정보 수정" centered>
        <EditProductInfo slug={slug} onSubmit={closeEditModal} />
      </Modal>
    </>
  )
);
