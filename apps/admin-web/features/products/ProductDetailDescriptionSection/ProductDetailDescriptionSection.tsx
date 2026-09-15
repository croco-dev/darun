'use client';

import { EditProductDescription, GenerateProductDescriptionButton, ProductDescription } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminModal, AdminPanel, AdminSectionHeader, AdminSectionBody, AdminLoadingState } from '@darun/ui-admin';
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
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="설명 수정">
        <EditProductDescription slug={slug} onSubmit={closeEditModal} />
      </AdminModal>
    </>
  );
};
