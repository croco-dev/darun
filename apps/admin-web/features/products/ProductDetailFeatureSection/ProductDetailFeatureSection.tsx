'use client';

import { EditProductFeatureItem, ProductFeatureTable } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
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
            <Button type="button" variant="contained" color="primary" as="a" href={`/products/${slug}/features/new`}>
              새 기능 추가
            </Button>
          }
        />
        <AdminSectionBody className="p-0">
          <ProductFeatureTable slug={slug} editFeature={editFeature} />
        </AdminSectionBody>
      </AdminPanel>
      {isEditModalOpened && (
        <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">기능 정보 수정</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-900 hover:text-dark-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/20"
            >
              ✕
            </button>
          </div>
          {featureId ? (
            <EditProductFeatureItem featureId={featureId} onSubmit={closeEditModal} />
          ) : (
            <>오류 발생. 새로고침 후 시도.</>
          )}
        </dialog>
      )}
    </>
  );
};
