'use client';

import { useQuery } from '@apollo/client/react';
import { EditAlternativeProducts } from '@darun/products-feature';
import { TempProductBySlugOnEditAlternativeProductsDocument } from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminModal,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { useDisclosure } from '@mantine/hooks';
import { Layers } from 'lucide-react';

type ProductDetailAlternativeSectionProps = {
  slug: string;
};

export const ProductDetailAlternativeSection = ({ slug }: ProductDetailAlternativeSectionProps) => {
  const [isEditModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const { data, loading, error, refetch } = useQuery(TempProductBySlugOnEditAlternativeProductsDocument, {
    variables: { slug },
  });

  const alternatives = data?.tempProductBySlug?.alternatives ?? [];

  return (
    <>
      <AdminPanel>
        <AdminSectionHeader
          title="다른 서비스(대안) 관리"
          rightSide={
            <Button type="button" onClick={openEditModal} variant="contained" color="primary">
              대안 서비스 수정/추가
            </Button>
          }
        />
        <AdminSectionBody>
          {loading ? (
            <AdminLoadingState title="대안 서비스를 불러오는 중..." />
          ) : error ? (
            <AdminErrorState
              error={error}
              action={
                <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
                  다시 시도
                </Button>
              }
            />
          ) : alternatives.length === 0 ? (
            <AdminEmptyState
              title="등록된 대안 서비스가 없습니다."
              description="상단의 '대안 서비스 수정/추가' 버튼을 눌러 이 서비스와 유사하거나 비교 가능한 대안 서비스를 연결하세요."
            />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-dark-500">현재 연결된 대안 서비스 ({alternatives.length}개):</p>
              <div className="flex flex-wrap gap-2.5">
                {alternatives.map(alt => (
                  <div
                    key={alt.id}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dark-200 bg-surface-100/50 hover:bg-surface-100 hover:border-dark-300 transition shadow-sm"
                  >
                    <Layers size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-dark-900">{alt.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminSectionBody>
      </AdminPanel>
      <AdminModal opened={isEditModalOpened} onClose={closeEditModal} title="다른 서비스(대안) 관리">
        <EditAlternativeProducts slug={slug} onSubmit={closeEditModal} />
      </AdminModal>
    </>
  );
};
