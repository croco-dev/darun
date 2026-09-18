'use client';

import { Button, Dialog } from '@darun/ui';
import { notFound } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { ExternalLink, ImageOff, Maximize2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ScreenshotDetailState, useScreenshotDetail } from './useScreenshotDetail';
import {
  UNCLASSIFIED_LABEL,
  VISUAL_PLATFORM_LABELS,
  VISUAL_SCREEN_TYPE_LABELS,
  isVisualPlatformValue,
  isVisualScreenTypeValue,
} from './visualClassifications';

function DetailImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label="이미지를 불러올 수 없음"
        className="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dark-200 bg-surface-100 text-dark-400"
      >
        <ImageOff size={32} aria-hidden="true" />
        <span className="text-sm text-dark-500">이미지를 불러올 수 없어요.</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        setHasError(true);
        onError();
      }}
      className="max-h-[calc(100dvh-16rem)] w-full rounded-2xl border border-dark-150 bg-surface-100 object-contain"
    />
  );
}

const View = ({ status, detail, isImageError, onImageError, retry }: ScreenshotDetailState) => {
  const router = useRouter();
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (status === 'loading') {
    return (
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 md:px-6" aria-busy="true">
          <div
            className="h-8 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="h-4 w-1/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="min-h-72 w-full animate-pulse rounded-2xl bg-surface-200 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">스크린샷을 불러오는 중</span>
        </div>
      </main>
    );
  }

  if (status === 'not-found') {
    notFound();
  }

  if (status === 'error' || detail === null) {
    return (
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 md:px-6">
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
          >
            <p className="text-sm font-semibold text-dark-900">스크린샷을 불러오지 못했어요.</p>
            <Button type="button" variant="contained" color="primary" size="sm" onClick={() => retry()}>
              <RefreshCw size={16} />
              다시 시도
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const { imageUrl, imageAlt, title, platform, screenType, product } = detail;
  const displayTitle = title ?? imageAlt;
  const platformLabel =
    platform && isVisualPlatformValue(platform) ? VISUAL_PLATFORM_LABELS[platform] : UNCLASSIFIED_LABEL;
  const screenTypeLabel =
    screenType && isVisualScreenTypeValue(screenType) ? VISUAL_SCREEN_TYPE_LABELS[screenType] : UNCLASSIFIED_LABEL;

  return (
    <main id="main-content" className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="break-words text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">{displayTitle}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-dark-500">
            <span className="font-medium text-dark-700">{product.name}</span>
            <span aria-hidden="true" className="text-dark-300">
              ·
            </span>
            <span>{platformLabel}</span>
            <span aria-hidden="true" className="text-dark-300">
              ·
            </span>
            <span>{screenTypeLabel}</span>
          </p>
        </div>

        <div className="relative">
          <DetailImage src={imageUrl} alt={imageAlt} onError={onImageError} />
          {!isImageError && (
            <Button
              type="button"
              variant="shadow"
              color="primary"
              size="sm"
              onClick={() => setIsZoomOpen(true)}
              className="absolute bottom-3 right-3"
              aria-haspopup="dialog"
            >
              <Maximize2 size={16} />
              <span className="hidden sm:inline">확대</span>
              <span className="sr-only sm:hidden">확대</span>
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            as="a"
            href={`/?product=${encodeURIComponent(product.slug)}`}
            variant="contained"
            color="primary"
            size="md"
          >
            이 서비스의 화면
          </Button>
          <Button
            as="a"
            href={`https://darun.io/ko/products/${encodeURIComponent(product.slug)}`}
            variant="shadow"
            color="primary"
            size="md"
          >
            <ExternalLink size={16} />
            서비스 소개
          </Button>
          <Button
            type="button"
            variant="text"
            color="primary"
            size="md"
            onClick={() => router.back()}
            className="sm:ml-auto"
          >
            뒤로 가기
          </Button>
        </div>
      </div>

      <Dialog
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        labelledBy="screenshot-zoom-heading"
        className="w-full"
      >
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col items-center gap-3 p-4">
          <h2 id="screenshot-zoom-heading" className="max-w-full truncate text-base font-bold text-white">
            {displayTitle}
          </h2>
          <div className="max-h-[calc(100dvh-9rem)] w-full overflow-y-auto">
            <img src={imageUrl} alt={imageAlt} className="mx-auto max-w-full rounded-lg object-contain" />
          </div>
          <Button type="button" variant="contained" color="primary" size="sm" onClick={() => setIsZoomOpen(false)}>
            닫기
          </Button>
        </div>
      </Dialog>
    </main>
  );
};

export const ScreenshotDetail = bind((props: { id: string }) => ({ ...useScreenshotDetail(props.id) }), View, {
  displayName: 'ScreenshotDetail',
});
