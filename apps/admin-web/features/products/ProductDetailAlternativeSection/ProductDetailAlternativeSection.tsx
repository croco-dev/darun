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
            <h2 className="text-xl font-semibold text-dark-900">다른 서비스 관리</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-500 hover:text-dark-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 rounded-lg p-1.5"
              aria-label="닫기"
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
