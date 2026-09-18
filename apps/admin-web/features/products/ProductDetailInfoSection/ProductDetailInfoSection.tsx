'use client';

import {
  EditProductInfo,
  IndexProductButton,
  ProductInfo,
  PublishProductButton,
  TranslateProductButton,
} from '@darun/products-feature';
import { Button, ExternalLink } from '@darun/ui';
import { AdminModal, AdminPanel } from '@darun/ui-admin';
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
        <div className="px-5 py-3 bg-surface-100/30 flex flex-wrap justify-between items-center gap-3">
          <Button
            as="a"
            href={`https://darun.io/products/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            color="secondary"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            서비스 바로가기
            <ExternalLink size={14} />
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openEditModal} variant="base" color="secondary" size="sm">
              기본 정보 수정
            </Button>
            <TranslateProductButton slug={slug} />
            <IndexProductButton slug={slug} />
            <PublishProductButton slug={slug} />
          </div>
        </div>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="기본 정보 수정">
        <EditProductInfo slug={slug} onSubmit={closeEditModal} onCancel={closeEditModal} />
      </AdminModal>
    </>
  );
};
