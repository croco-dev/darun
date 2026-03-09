import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Pencil } from 'lucide-react';
import { Suspense } from 'react';
import { ProductDescription, GenerateProductDescriptionButton } from '../../components';
import { EditProductDescription } from '../../components/EditProductDescription';
import { useProductDetailDescriptionSection } from './useProductDetailDescriptionSection';

export const ProductDetailDescriptionSection = bind(
  useProductDetailDescriptionSection,
  ({ slug, isEditModalOpened, openEditModal, closeEditModal }) => (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-900">설명</h3>
          <div className="flex gap-2">
            <GenerateProductDescriptionButton slug={slug} />
            <Button type="button" onClick={openEditModal} variant="base" size="sm">
              <span className="inline-flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                수정
              </span>
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 px-4 py-2">
            <Suspense fallback={<>로딩 중...</>}>
              <ProductDescription slug={slug} />
            </Suspense>
          </div>
        </div>
      </div>
      {isEditModalOpened && (
        <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">설명 수정</h2>
            <button type="button" onClick={closeEditModal} className="text-dark-900 hover:text-dark-900/70">
              ✕
            </button>
          </div>
          <EditProductDescription slug={slug} onSubmit={closeEditModal} />
        </dialog>
      )}
    </>
  )
);
