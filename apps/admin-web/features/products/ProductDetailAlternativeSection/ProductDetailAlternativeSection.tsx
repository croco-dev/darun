'use client';

import { EditAlternativeProducts } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useDisclosure } from '@mantine/hooks';

type ProductDetailAlternativeSectionProps = {
  slug: string;
};

export const ProductDetailAlternativeSection = ({ slug }: ProductDetailAlternativeSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="다른 서비스 관리"
          rightSide={
            <Button type="button" onClick={openEditModal} variant="contained" color="primary">
              다른 서비스 추가
            </Button>
          }
        />
        <AdminSectionBody>준비중</AdminSectionBody>
      </AdminPanel>
      {isEditModalOpened && (
        <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">설명 수정</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-900 hover:text-dark-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/20"
            >
              ✕
            </button>
          </div>
          <EditAlternativeProducts slug={slug} onSubmit={closeEditModal} />
        </dialog>
      )}
    </>
  );
};
