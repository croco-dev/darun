'use client';

import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteProductFlowOnDetailSectionDocument,
  GetProductFlowsOnDetailSectionDocument,
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
import { Link } from '@darun/utils-router';
import { notifications } from '@mantine/notifications';
import { ImageOff, Layers, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
gql`
  query GetProductFlowsOnDetailSection($slug: String!) {
    adminProductFlows(productSlug: $slug) {
      id
      title
      description
      platform
      flowType
      stepCount
      coverScreenshot {
        id
        imageUrl
        imageAlt
      }
      steps {
        position
        caption
        screenshot {
          id
          title
        }
      }
    }
  }

  mutation DeleteProductFlowOnDetailSection($id: ID!) {
    deleteProductFlow(input: { id: $id }) {
      success
    }
  }
`;

type ProductDetailFlowSectionProps = {
  slug: string;
};

const FLOW_TYPE_LABELS: Record<string, string> = {
  ONBOARDING: '온보딩',
  SIGN_UP: '회원가입',
  SIGN_IN: '로그인',
  SEARCH: '검색',
  CHECKOUT: '결제',
  SETTINGS: '설정',
  OTHER: '기타',
};

const PLATFORM_LABELS: Record<string, string> = {
  WEB: '웹',
  IOS: 'iOS',
  ANDROID: '안드로이드',
};

function FlowCoverImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-dark-100 text-dark-500">
        <ImageOff size={20} aria-hidden />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="aspect-video w-full rounded-md object-cover" onError={() => setFailed(true)} />
  );
}

export const ProductDetailFlowSection = ({ slug }: ProductDetailFlowSectionProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(GetProductFlowsOnDetailSectionDocument, {
    variables: { slug },
  });

  const [deleteFlow] = useMutation(DeleteProductFlowOnDetailSectionDocument, {
    onError: err => {
      notifications.show({
        title: '삭제 실패',
        message: err.message,
        color: 'red',
      });
    },
    onCompleted: () => {
      notifications.show({
        message: '플로가 삭제되었습니다.',
        color: 'teal',
      });
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (deletingId !== null) {
      return;
    }
    if (!window.confirm('이 플로를 삭제하시겠습니까? 플로에 포함된 스크린샷은 삭제되지 않습니다.')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteFlow({ variables: { id } });
    } finally {
      setDeletingId(null);
    }
  };

  const flows = (data?.adminProductFlows ?? []).flatMap(flow => {
    const cover = flow?.coverScreenshot;
    if (!flow || !cover || !flow.id) {
      return [];
    }
    return [
      {
        id: flow.id,
        title: flow.title ?? '',
        platform: flow.platform ?? '',
        flowType: flow.flowType ?? '',
        stepCount: flow.stepCount ?? 0,
        coverImageUrl: cover.imageUrl ?? '',
        coverImageAlt: cover.imageAlt ?? '',
      },
    ];
  });

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="UX 플로 관리"
        rightSide={
          <Button
            as={Link}
            href={`/products/${slug}/flows/new`}
            variant="contained"
            color="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus size={16} />
            플로 추가
          </Button>
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
        ) : flows.length === 0 ? (
          <AdminEmptyState
            title="등록된 UX 플로가 없습니다."
            description="사용 흐름을 단계별 스크린샷으로 구성해 Visual에 공개해 보세요."
            action={
              <Button
                as={Link}
                href={`/products/${slug}/flows/new`}
                variant="contained"
                color="primary"
                size="sm"
                className="flex items-center gap-1.5"
              >
                <Plus size={16} />
                플로 추가
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {flows.map(flow => (
              <div
                key={flow.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-dark-200 bg-surface-100/30 p-2 transition hover:border-dark-300 hover:shadow-card"
              >
                <div className="relative">
                  <FlowCoverImage src={flow.coverImageUrl} alt={flow.coverImageAlt || '플로 커버 화면'} />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-dark-900/80 px-2 py-0.5 text-xs font-medium text-surface-50">
                    <Layers size={12} aria-hidden />
                    {flow.stepCount}단계
                  </span>
                </div>
                <div className="mt-2.5 flex flex-1 flex-col gap-1 px-1">
                  <span className="truncate text-sm font-semibold text-dark-900" title={flow.title}>
                    {flow.title}
                  </span>
                  <span className="text-xs text-dark-500">
                    {PLATFORM_LABELS[flow.platform] ?? flow.platform} ·{' '}
                    {FLOW_TYPE_LABELS[flow.flowType] ?? flow.flowType}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 px-1">
                  <Link
                    href={`/products/${slug}/flows/${flow.id}/edit`}
                    className="rounded p-1 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900"
                    title="플로 수정"
                    aria-label={`${flow.title} 플로 수정`}
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(flow.id)}
                    disabled={deletingId !== null}
                    className="rounded p-1 text-dark-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title={deletingId === flow.id ? '삭제 중...' : '플로 삭제'}
                    aria-label={deletingId === flow.id ? `${flow.title} 삭제 중` : `${flow.title} 플로 삭제`}
                  >
                    {deletingId === flow.id ? (
                      <Loader2 size={16} className="animate-spin text-red-600 motion-reduce:animate-none" />
                    ) : (
                      <Trash2 size={16} />
                    )}
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
