'use client';

import { EditAlternativeProducts } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminEmptyState, AdminModal, AdminPanel, AdminSectionBody, AdminSectionHeader } from '@darun/ui-admin';
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
        <AdminSectionBody>
          <AdminEmptyState
            title="대체 서비스 관리"
            description="상단의 '다른 서비스 추가' 버튼을 눌러 이 서비스와 유사하거나 비교 가능한 대안 서비스를 연결하세요."
          />
        </AdminSectionBody>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="다른 서비스(대안) 관리">
        <EditAlternativeProducts slug={slug} onSubmit={closeEditModal} />
      </AdminModal>
    </>
  );
};
