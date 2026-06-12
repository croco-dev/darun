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
        <dialog
          open={isEditModalOpened}
          className="p-6 rounded-xl border border-dark-200 bg-white shadow-lg backdrop:bg-black/50 z-50 focus-visible:outline-none min-w-[500px]"
          onClick={e => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              closeEditModal();
            }
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-dark-900">기능 정보 수정</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-500 hover:text-dark-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 rounded-lg p-1.5"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          {featureId ? (
            <EditProductFeatureItem featureId={featureId} onSubmit={closeEditModal} />
          ) : (
            <p className="text-sm text-dark-500">오류 발생. 새로고침 후 시도.</p>
          )}
        </dialog>
      )}
    </>
  );
};
