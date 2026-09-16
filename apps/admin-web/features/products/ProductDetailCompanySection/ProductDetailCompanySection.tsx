'use client';

import { EditProductCompany, ProductCompanyInfo } from '@darun/products-feature';
import { Button } from '@darun/ui';
import { AdminModal, AdminPanel, AdminSectionBody, AdminSectionHeader } from '@darun/ui-admin';
import { useDisclosure } from '@mantine/hooks';

export const ProductDetailCompanySection = ({ slug }: { slug: string }) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="운영사 관리"
          rightSide={
            <Button type="button" variant="contained" color="primary" onClick={openEditModal}>
              정보 수정
            </Button>
          }
        />
        <AdminSectionBody>
          <ProductCompanyInfo slug={slug} onConnectCompany={openEditModal} />
        </AdminSectionBody>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="운영사 수정">
        <EditProductCompany slug={slug} onSubmit={closeEditModal} onCancel={closeEditModal} />
      </AdminModal>
    </>
  );
};
