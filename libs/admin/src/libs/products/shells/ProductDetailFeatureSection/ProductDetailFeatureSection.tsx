import { bind } from '@croco/utils-structure-react';
import { Button, Card, Group, Modal, Stack, Title } from '@mantine/core';
import { ProductFeatureTable } from '@products/components';
import Link from 'next/link';
import { EditProductFeatureItem } from '../../components/EditProductFeatureItem';
import { useProductDetailFeatureSection } from './useProductDetailFeatureSection';

export const ProductDetailFeatureSection = bind(
  useProductDetailFeatureSection,
  ({ slug, isEditModalOpened, closeEditModal, editFeature, featureId }) => {
    return (
      <>
        <Stack gap={8}>
          <Group justify={'space-between'}>
            <Title order={3}>기능 관리</Title>
            <Link href={`/products/${slug}/features/new`}>
              <Button color={'dark'}>새 기능 추가</Button>
            </Link>
          </Group>
          <Card withBorder shadow="sm" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              <ProductFeatureTable slug={slug} editFeature={editFeature} />
            </Card.Section>
          </Card>
        </Stack>
        <Modal opened={isEditModalOpened} onClose={closeEditModal} title="기능 정보 수정" centered>
          {featureId ? (
            <EditProductFeatureItem featureId={featureId} onSubmit={closeEditModal} />
          ) : (
            <>오류 발생. 새로고침 후 시도.</>
          )}
        </Modal>
      </>
    );
  }
);
