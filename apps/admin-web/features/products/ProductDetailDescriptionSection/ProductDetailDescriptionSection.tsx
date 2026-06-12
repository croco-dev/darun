'use client';

import { EditProductDescription, GenerateProductDescriptionButton, ProductDescription } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody, AdminLoadingState } from '@darun/ui-admin';
import { useDisclosure } from '@mantine/hooks';
import { Pencil } from 'lucide-react';
import { Suspense } from 'react';

type ProductDetailDescriptionSectionProps = {
  slug: string;
};

export const ProductDetailDescriptionSection = ({ slug }: ProductDetailDescriptionSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="설명"
          rightSide={
            <div className="flex gap-2">
              <GenerateProductDescriptionButton slug={slug} />
              <Button type="button" onClick={openEditModal} variant="base" size="sm">
                <span className="inline-flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  수정
                </span>
              </Button>
            </div>
          }
        />
        <AdminSectionBody>
          <Suspense fallback={<AdminLoadingState />}>
            <ProductDescription slug={slug} />
          </Suspense>
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
            <h2 className="text-xl font-semibold text-dark-900">설명 수정</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-500 hover:text-dark-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 rounded-lg p-1.5"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <EditProductDescription slug={slug} onSubmit={closeEditModal} />
        </dialog>
      )}
    </>
  );
};
