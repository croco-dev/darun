'use client';

import { EditProductDescription, GenerateProductDescriptionButton, ProductDescription } from '@darun/products-feature';
import { Button, Pencil } from '@darun/ui';
import { AdminModal, AdminPanel, AdminSectionHeader, AdminSectionBody } from '@darun/ui-admin';
import { useRouter, usePathname, useSearchParams } from '@darun/utils-router';
import { useDisclosure } from '@mantine/hooks';
import { useCallback } from 'react';

type ProductDetailDescriptionSectionProps = {
  slug: string;
};

export const ProductDetailDescriptionSection = ({ slug }: ProductDetailDescriptionSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const descriptionJobId = params.get('descriptionJobId') ?? undefined;
  const onJobChange = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set('descriptionJobId', id);
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [params, pathname, router]
  );

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="설명"
          rightSide={
            <div className="flex gap-2">
              <GenerateProductDescriptionButton
                slug={slug}
                descriptionJobId={descriptionJobId}
                onJobChange={onJobChange}
              />
              <Button
                type="button"
                onClick={openEditModal}
                variant="contained"
                color="secondary"
                size="sm"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="inline-flex items-center gap-2">
                  <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">수정</span>
                </span>
              </Button>
            </div>
          }
        />
        <AdminSectionBody>
          <ProductDescription slug={slug} />
        </AdminSectionBody>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="설명 수정">
        <EditProductDescription slug={slug} onSubmit={closeEditModal} onCancel={closeEditModal} />
      </AdminModal>
    </>
  );
};
