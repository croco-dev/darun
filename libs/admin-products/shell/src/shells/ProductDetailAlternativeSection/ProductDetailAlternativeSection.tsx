import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { EditAlternativeProducts } from '../../components/EditAlternativeProducts';
import { useProductDetailAlternativeSection } from './useProductDetailAlternativeSection';

export const ProductDetailAlternativeSection = bind(
  useProductDetailAlternativeSection,
  ({ slug, isEditModalOpened, closeEditModal, openEditModal }) => (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-900">다른 서비스 관리</h3>
          <Button type="button" onClick={openEditModal} variant="contained" color="secondary">
            다른 서비스 추가
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 px-4 py-2">
            준비중
          </div>
        </div>
      </div>
      {isEditModalOpened && (
        <dialog
          open={isEditModalOpened}
          className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">설명 수정</h2>
            <button
              type="button"
              onClick={closeEditModal}
              className="text-dark-900 hover:text-dark-900/70"
            >
              ✕
            </button>
          </div>
          <EditAlternativeProducts slug={slug} onSubmit={closeEditModal} />
        </dialog>
      )}
    </>
  )
);
