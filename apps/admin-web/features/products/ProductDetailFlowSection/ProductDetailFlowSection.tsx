'use client';

import { Button, ImageOff, Layers, Loader2, Pencil, Plus, Trash2 } from '@darun/ui';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionBody,
  AdminSectionHeader,
} from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { useRef, useState } from 'react';
import { useProductFlowPages } from './useProductFlowPages';

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

function FlowCoverImage({ src, alt }: { src?: string; alt?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  if (failed || !src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-dark-100 text-dark-500">
        <ImageOff size={20} className="shrink-0" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || '플로 커버 이미지'}
      className="aspect-video w-full rounded-md object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function ProductDetailFlowSection({ slug }: ProductDetailFlowSectionProps) {
  return <ProductFlowList key={slug} slug={slug} />;
}

function ProductFlowList({ slug }: ProductDetailFlowSectionProps) {
  const {
    flows,
    loading,
    error,
    refetch,
    hasNextPage,
    pageFailure,
    loadingPage,
    loadMore,
    retryPage,
    deletingId,
    deleteFlow,
  } = useProductFlowPages(slug);
  const pageFooter = useRef<HTMLDivElement>(null);

  const handleDelete = (id: string) => {
    if (window.confirm('이 플로를 삭제하시겠습니까? 플로에 포함된 스크린샷은 삭제되지 않습니다.')) {
      void deleteFlow(id);
    }
  };

  const handlePageRequest = async (button: HTMLButtonElement) => {
    const hasMore = await (pageFailure ? retryPage() : loadMore());
    if (hasMore === false && document.activeElement === button) {
      pageFooter.current?.focus();
    }
  };

  return (
    <AdminPanel>
      <AdminSectionHeader
        title="UX 플로 관리"
        rightSide={
          <Button
            as={Link}
            href={`/products/${encodeURIComponent(slug)}/flows/new`}
            variant="contained"
            color="primary"
            size="sm"
            className="flex items-center gap-1.5 active:scale-[0.98] motion-reduce:transform-none"
          >
            <Plus size={16} className="shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">플로 추가</span>
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
              <Button
                type="button"
                onClick={() => refetch()}
                variant="contained"
                color="primary"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
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
                href={`/products/${encodeURIComponent(slug)}/flows/new`}
                variant="contained"
                color="primary"
                size="sm"
                className="flex items-center gap-1.5 active:scale-[0.98] motion-reduce:transform-none"
              >
                <Plus size={16} className="shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">플로 추가</span>
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
                  <FlowCoverImage
                    src={flow.coverScreenshot?.imageUrl}
                    alt={flow.coverScreenshot?.imageAlt || (flow.title ? `${flow.title} 플로 커버` : '플로 커버 화면')}
                  />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-dark-900/80 px-2 py-0.5 text-xs font-medium text-surface-50">
                    <Layers size={12} className="shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{flow.stepCount}단계</span>
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
                    href={`/products/${encodeURIComponent(slug)}/flows/${encodeURIComponent(flow.id)}/edit`}
                    className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded p-1 text-dark-400 transition hover:bg-surface-100 hover:text-dark-900 active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
                    title="플로 수정"
                    aria-label={`${flow.title} 플로 수정`}
                  >
                    <Pencil size={16} className="shrink-0" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(flow.id)}
                    disabled={deletingId !== null || loadingPage}
                    className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded p-1 text-dark-400 transition hover:bg-cherry-50 hover:text-cherry-600 active:scale-95 disabled:opacity-50 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry-600/60"
                    title={deletingId === flow.id ? '삭제 중...' : '플로 삭제'}
                    aria-label={deletingId === flow.id ? `${flow.title} 삭제 중` : `${flow.title} 플로 삭제`}
                  >
                    {deletingId === flow.id ? (
                      <Loader2 size={16} className="animate-spin text-cherry-600 motion-reduce:animate-none" />
                    ) : (
                      <Trash2 size={16} className="shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          ref={pageFooter}
          tabIndex={-1}
          role="group"
          aria-label="플로 목록 페이지"
          className="mt-4 flex flex-col items-center gap-2"
        >
          {pageFailure && (
            <p role="alert" className="text-sm text-cherry-600">
              {pageFailure === 'refresh'
                ? '삭제 후 플로 목록을 갱신하지 못했습니다.'
                : '플로를 더 불러오지 못했습니다.'}
            </p>
          )}
          {loadingPage && (
            <p role="status" className="text-sm text-dark-500">
              플로를 불러오는 중입니다.
            </p>
          )}
          {(hasNextPage || pageFailure || loadingPage) && (
            <Button
              type="button"
              variant="contained"
              color="secondary"
              aria-disabled={loadingPage || deletingId !== null}
              onClick={event => {
                if (!loadingPage && deletingId === null) void handlePageRequest(event.currentTarget);
              }}
            >
              {pageFailure ? '목록 다시 시도' : '플로 더 보기'}
            </Button>
          )}
        </div>
      </AdminSectionBody>
    </AdminPanel>
  );
}
