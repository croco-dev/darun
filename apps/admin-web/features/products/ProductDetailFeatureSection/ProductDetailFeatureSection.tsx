'use client';

import { EditProductFeatureItem, ProductFeatureTable } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-900">기능 관리</h3>
          <Link href={`/products/${slug}/features/new`}>
            <Button type="button" variant="contained" color="secondary">
              새 기능 추가
            </Button>
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 px-4 py-2">
            <ProductFeatureTable slug={slug} editFeature={editFeature} />
          </div>
        </div>
      </div>
      {isEditModalOpened && (
        <dialog open={isEditModalOpened} className="rounded-xl bg-white p-6 shadow-lg backdrop:bg-black/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">기능 정보 수정</h2>
            <button type="button" onClick={closeEditModal} className="text-dark-900 hover:text-dark-900/70">
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
