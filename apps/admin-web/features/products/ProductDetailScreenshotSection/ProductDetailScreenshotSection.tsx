'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetProductScreenshotsOnDetailSectionDocument,
  DeleteProductScreenshotOnDetailSectionDocument,
} from '@darun/provider-graphql';
import { Button } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { notifications } from '@mantine/notifications';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetProductScreenshotsOnDetailSection($slug: String!) {
    tempProductBySlug(slug: $slug) {
      id
      screenshots {
        id
        imageUrl
        imageAlt
      }
    }
  }

  mutation DeleteProductScreenshotOnDetailSection($id: String!) {
    deleteProductScreenshot(id: $id) {
      success
    }
  }
`;

type ProductDetailScreenshotSectionProps = {
  slug: string;
};

export const ProductDetailScreenshotSection = ({ slug }: ProductDetailScreenshotSectionProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GetProductScreenshotsOnDetailSectionDocument, {
    variables: { slug },
  });

  const [deleteScreenshot] = useMutation(DeleteProductScreenshotOnDetailSectionDocument, {
    onError: err => {
      notifications.show({
        title: '삭제 실패',
        message: err.message,
        color: 'red',
      });
    },
    onCompleted: () => {
      notifications.show({
        message: '스크린샷이 삭제되었습니다.',
        color: 'teal',
      });
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 스크린샷을 삭제하시겠습니까?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteScreenshot({ variables: { id } });
    } finally {
      setDeletingId(null);
    }
  };

  const screenshots = data?.tempProductBySlug?.screenshots ?? [];

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="스크린샷 관리"
        rightSide={
          <Link href={`/products/${slug}/screenshots/new`}>
            <Button type="button" variant="contained" color="primary" size="sm" className="flex items-center gap-1.5">
              <Plus size={16} />
              스크린샷 추가
            </Button>
          </Link>
        }
      />
      <AdminSectionBody>
        {loading ? (
          <AdminLoadingState />
        ) : error ? (
          <AdminErrorState
            error={error}
            action={
              <Button type="button" onClick={() => refetch()} variant="contained" color="primary">
                다시 시도
              </Button>
            }
          />
        ) : screenshots.length === 0 ? (
          <AdminEmptyState
            title="등록된 스크린샷이 없습니다."
            description="서비스의 주요 기능 및 화면을 보여주는 스크린샷을 등록해 보세요."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {screenshots.map(screenshot => (
              <div
                key={screenshot.id}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-dark-200 bg-surface-100/30 p-2 transition hover:border-dark-300 hover:shadow-card"
              >
                <div className="aspect-video w-full overflow-hidden rounded-md bg-dark-100">
                  <img
                    src={screenshot.imageUrl}
                    alt={screenshot.imageAlt || '서비스 스크린샷'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-xs font-medium text-dark-700" title={screenshot.imageAlt}>
                    {screenshot.imageAlt || '(대체 텍스트 없음)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(screenshot.id)}
                    disabled={deletingId === screenshot.id}
                    className="rounded p-1 text-dark-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="스크린샷 삭제"
                    aria-label="스크린샷 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionBody>
    </AdminPanel>
  );
};
