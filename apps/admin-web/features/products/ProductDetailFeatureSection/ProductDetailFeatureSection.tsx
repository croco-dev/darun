'use client';

import { EditProductFeatureItem, ProductFeatureTable } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminModal, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';

type ProductDetailFeatureSectionProps = {
  slug: string;
};

export const ProductDetailFeatureSection = ({ slug }: ProductDetailFeatureSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [featureId, setFeatureId] = useState<string | null>(null);

  const editFeature = useCallback(
    (id: string) => {
      setFeatureId(id);
      openEditModal();
    },
    [openEditModal]
  );

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="기능 관리"
          rightSide={
            <Button as={Link} href={`/products/${slug}/features/new`} variant="contained" color="primary" size="sm">
              새 기능 추가
            </Button>
          }
        />
        <AdminSectionBody className="p-0">
          <ProductFeatureTable slug={slug} editFeature={editFeature} />
        </AdminSectionBody>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="기능 정보 수정">
        {featureId ? (
          <EditProductFeatureItem featureId={featureId} onSubmit={closeEditModal} />
        ) : (
          <p className="text-sm text-dark-500">오류 발생. 새로고침 후 시도.</p>
        )}
      </AdminModal>
    </>
  );
};
