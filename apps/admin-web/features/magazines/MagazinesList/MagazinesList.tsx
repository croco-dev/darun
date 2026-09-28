'use client';

import {
  Button,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Sparkles,
  User,
  formatDate,
} from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminLoadingState, AdminPanel } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useState } from 'react';
import { useMagazinesList } from './useMagazinesList';

function MagazineThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-100 to-surface-200 text-dark-400">
        <Sparkles size={28} className="shrink-0 text-dark-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export const MagazinesList = bind(
  useMagazinesList,
  ({ magazines, page, setPage, totalCount, totalPages, loading, error, refetch }) => {
    if (loading) {
      return (
        <AdminPanel className="p-8">
          <AdminLoadingState />
        </AdminPanel>
      );
    }

    if (error) {
      return (
        <AdminPanel className="p-8">
          <AdminErrorState
            title="매거진 목록을 불러오지 못했습니다."
            error={error}
            action={
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={() => {
                  refetch().catch(() => {});
                }}
              >
                <span className="select-none whitespace-nowrap">다시 시도</span>
              </Button>
            }
          />
        </AdminPanel>
      );
    }

    if (!magazines || magazines.length === 0) {
      return (
        <AdminPanel className="p-8">
          <AdminEmptyState
            title="등록된 매거진이 없습니다."
            description="우측 상단의 '새로운 매거진 발행' 버튼을 눌러 첫 매거진을 등록해 보세요."
          />
        </AdminPanel>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {magazines.map(item => {
            const isPublished = Boolean(item.publishedAt);
            const displayDate = item.publishedAt ?? item.updatedAt;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-dark-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-100 border-b border-dark-150">
                  <MagazineThumbnail src={item.backgroundImageUrl} alt={item.title} />
                  {/* Publication Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md select-none whitespace-nowrap ${
                        isPublished ? 'bg-leaf-600/90 text-white' : 'bg-dark-900/80 text-white'
                      }`}
                    >
                      {isPublished ? (
                        <>
                          <CheckCircle2 size={12} className="shrink-0" aria-hidden="true" />
                          발행됨
                        </>
                      ) : (
                        <>
                          <Clock size={12} className="shrink-0" aria-hidden="true" />
                          초안(미발행)
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2">
                    <code className="inline-block text-2xs font-mono text-dark-500 bg-surface-100 px-2 py-0.5 rounded border border-dark-150 select-none">
                      /{item.slug}
                    </code>
                  </div>
                  <h3 className="text-base font-bold text-dark-900 line-clamp-2 mb-2 leading-snug break-words [word-break:keep-all]">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-dark-500 line-clamp-2 leading-relaxed mb-4 break-words [word-break:keep-all]">
                      {item.summary}
                    </p>
                  )}

                  {/* Meta info & links */}
                  <div className="mt-auto pt-3 border-t border-dark-150 flex items-center justify-between text-xs text-dark-500">
                    <div className="flex items-center gap-3">
                      {item.author?.name && (
                        <span className="inline-flex items-center gap-1">
                          <User size={12} className="shrink-0 text-dark-400" aria-hidden="true" />
                          <span className="max-w-[100px] truncate">{item.author.name}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="shrink-0 text-dark-400" aria-hidden="true" />
                        <span className="tabular-nums whitespace-nowrap">{formatDate(displayDate)}</span>
                      </span>
                    </div>

                    {isPublished && (
                      <a
                        href={`https://darun.io/ko/magazines/${encodeURIComponent(item.slug)}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-[32px] items-center gap-1 px-2 rounded text-dark-600 hover:text-dark-900 font-medium active:scale-95 motion-reduce:transform-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
                        title="서비스 웹에서 보기"
                      >
                        <span className="whitespace-nowrap">보기</span>
                        <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <AdminPanel className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-dark-900 tabular-nums">
                총 {totalCount}개의 매거진 중 {page} / {totalPages} 페이지
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="base"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="inline-flex items-center gap-2 select-none whitespace-nowrap">
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                    이전
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="base"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  className="active:scale-[0.98] motion-reduce:transform-none"
                >
                  <span className="inline-flex items-center gap-2 select-none whitespace-nowrap">
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    다음
                  </span>
                </Button>
              </div>
            </div>
          </AdminPanel>
        )}
      </div>
    );
  }
);
