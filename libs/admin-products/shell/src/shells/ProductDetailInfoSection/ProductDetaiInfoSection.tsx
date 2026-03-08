import { bind } from "@croco/utils-structure-react";
import { Button } from "@darun/ui";
import { Modal } from "@mantine/core";
import { IndexProductButton, ProductInfo } from "../../components";
import { EditProductInfo } from "../../components/EditProductInfo/EditProductInfo";
import { PublishProductButton } from "../../components/PublishProductButton";
import { useProductDetailInfoSection } from "./useProductDetailInfoSection";

export const ProductDetailInfoSection = bind(
  useProductDetailInfoSection,
  ({ slug, isEditModalOpened, openEditModal, closeEditModal }) => (
    <>
      <div className="border border-gray-200 shadow-sm rounded-md">
        <div className="border-b p-4">
          <div className="flex justify-between items-center">
            <ProductInfo slug={slug} />
          </div>
        </div>
        <div className="border-b p-4">
          <div className="flex justify-between">
            <div></div>
            <div className="flex gap-2">
              <Button onClick={openEditModal} variant="text" size="sm">
                기본 정보 수정
              </Button>
              <IndexProductButton slug={slug} />
              <PublishProductButton slug={slug} />
            </div>
          </div>
        </div>
      </div>
      <Modal
        opened={isEditModalOpened}
        onClose={closeEditModal}
        title="기본 정보 수정"
        centered
      >
        <EditProductInfo slug={slug} onSubmit={closeEditModal} />
      </Modal>
    </>
  ),
);
