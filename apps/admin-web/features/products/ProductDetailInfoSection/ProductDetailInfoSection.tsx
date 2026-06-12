'use client';

import { EditProductInfo, IndexProductButton, ProductInfo, PublishProductButton } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminPanel } from '@darun/ui-admin';
import { useDisclosure } from '@mantine/hooks';

type ProductDetailInfoSectionProps = {
  slug: string;
};

export const ProductDetailInfoSection = ({ slug }: ProductDetailInfoSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  return (
    <>
      <AdminPanel>
        <div className="p-5 border-b border-dark-200">
          <div className="flex justify-between items-center">
            <ProductInfo slug={slug} />
          </div>
        </div>
        <div className="px-5 py-3 bg-dark-50/30 flex justify-between items-center">
          <div></div>
          <div className="flex gap-2">
            <Button onClick={openEditModal} variant="base" color="secondary" size="sm">
              기본 정보 수정
            </Button>
            <IndexProductButton slug={slug} />
            <PublishProductButton slug={slug} />
          </div>
        </div>
      </AdminPanel>
      {isEditModalOpened && (
        <dialog
          open={isEditModalOpened}
          className="p-0 rounded-xl border border-dark-200 bg-white shadow-lg backdrop:bg-black/50 z-50 focus-visible:outline-none"
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
          <div className="p-6 min-w-[400px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-dark-900">기본 정보 수정</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-dark-500 hover:text-dark-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 rounded-lg p-1.5"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <EditProductInfo slug={slug} onSubmit={closeEditModal} />
          </div>
        </dialog>
      )}
    </>
  );
};
