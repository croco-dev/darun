'use client';

import { Button, Dialog, ExternalLink, ImageOff, Maximize2, RefreshCw } from '@darun/ui';
import { Link, notFound, useRouter } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useState } from 'react';
import { VISUAL_CARD_IMAGE_LOADING, VISUAL_DETAIL_IMAGE_FETCH_PRIORITY } from '../perf/imageLoading';
import { SaveButton } from '../collections/SaveButton';
import { ScreenshotDetailState, useScreenshotDetail } from './useScreenshotDetail';
import {
  UNCLASSIFIED_LABEL,
  VISUAL_PLATFORM_LABELS,
  VISUAL_SCREEN_TYPE_LABELS,
  isVisualPlatformValue,
  isVisualScreenTypeValue,
} from './visualClassifications';

function DetailImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const hasError = failedSrc === src;

  if (hasError) {
    return (
      <div
        role="img"
        aria-label="이미지를 불러올 수 없음"
        className="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-100 text-dark-400"
      >
        <ImageOff size={32} className="shrink-0" aria-hidden="true" />
        <span className="text-sm text-dark-500 break-words [word-break:keep-all]">이미지를 불러올 수 없어요.</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      fetchPriority={VISUAL_DETAIL_IMAGE_FETCH_PRIORITY}
      onError={() => {
        setFailedSrc(src);
        onError();
      }}
      className="max-h-[calc(100dvh-16rem)] w-full rounded-xl bg-surface-100 object-contain"
    />
  );
}

function CopyLinkButton() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Button
        type="button"
        variant="shadow"
        color="primary"
        size="sm"
        onClick={() => {
          if (typeof window === 'undefined' || !window.navigator.clipboard?.writeText) {
            setStatus('failed');
            return;
          }
          window.navigator.clipboard
            .writeText(window.location.href)
            .then(() => setStatus('copied'))
            .catch(() => setStatus('failed'));
        }}
        className="shrink-0 active:scale-[0.98] motion-reduce:transform-none"
      >
        <span className="whitespace-nowrap">링크 복사</span>
      </Button>
      {status !== 'idle' && (
        <p role="status" className="text-xs break-words [word-break:keep-all]">
          {status === 'copied' ? (
            <span className="text-dark-500">링크를 복사했어요.</span>
          ) : (
            <span className="text-cherry-600">링크 복사에 실패했어요. 주소창에서 직접 복사해 주세요.</span>
          )}
        </p>
      )}
    </div>
  );
}

const View = ({ status, detail, isImageError, onImageError, retry }: ScreenshotDetailState) => {
  const router = useRouter();
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:px-6" aria-busy="true">
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
      </div>
    );
  }

  if (status === 'not-found') {
    notFound();
  }

  if (status === 'error' || detail === null) {
    return (
      <div className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 md:px-6">
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dark-200 bg-surface-50 p-8 text-center"
          >
            <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
              스크린샷을 불러오지 못했어요.
            </p>
            <Button
              type="button"
              variant="contained"
              color="primary"
              size="sm"
              onClick={() => retry()}
              className="active:scale-[0.98] motion-reduce:transform-none"
            >
              <RefreshCw size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">다시 시도</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const {
    id,
    imageUrl,
    imageAlt,
    title,
    platform,
    screenType,
    product,
    flows,
    flowTotalCount,
    relatedScreenshots,
    relatedScreenshotTotalCount,
  } = detail;
  const displayTitle = title ?? imageAlt;
  const platformLabel =
    platform && isVisualPlatformValue(platform) ? VISUAL_PLATFORM_LABELS[platform] : UNCLASSIFIED_LABEL;
  const screenTypeLabel =
    screenType && isVisualScreenTypeValue(screenType) ? VISUAL_SCREEN_TYPE_LABELS[screenType] : UNCLASSIFIED_LABEL;
  const appHref = `/apps/${encodeURIComponent(product.slug)}`;

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 md:px-6">
        <nav
          aria-label="이동 경로"
          className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-dark-500"
        >
          <Link
            href="/apps"
            className="shrink-0 rounded font-semibold transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            앱
          </Link>
          <span aria-hidden="true" className="text-dark-300">
            /
          </span>
          <Link
            href={appHref}
            className="max-w-40 shrink-0 truncate rounded font-semibold transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60"
          >
            {product.name}
          </Link>
          <span aria-hidden="true" className="text-dark-300">
            /
          </span>
          <span aria-current="page" className="min-w-0 flex-1 truncate font-semibold text-dark-900">
            {displayTitle}
          </span>
        </nav>

        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={product.logoUrl || '/images/default-product-icon.svg'}
              alt={`${product.name} 로고`}
              className="h-10 w-10 shrink-0 rounded-xl border border-dark-150 bg-surface-100 object-cover"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-xs font-semibold text-dark-500">{product.name}</p>
              <h1 className="break-words [word-break:keep-all] text-2xl font-bold tracking-tight text-dark-900 md:text-3xl">
                {displayTitle}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-dark-150 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-dark-700">
              {platformLabel}
            </span>
            <span className="rounded-full border border-dark-150 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-dark-700">
              {screenTypeLabel}
            </span>
            <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <SaveButton
                item={{
                  kind: 'screenshot',
                  id,
                  title: displayTitle,
                  imageUrl,
                  href: `/screenshots/${encodeURIComponent(id)}`,
                  productName: product.name,
                }}
              />
              <CopyLinkButton />
            </span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            aria-label="스크린샷 크게 보기"
            className="min-w-0 rounded-2xl border border-dark-150 bg-surface-100 p-3 shadow-2xs md:p-4"
          >
            <div className="relative">
              <DetailImage src={imageUrl} alt={imageAlt} onError={onImageError} />
              {!isImageError && (
                <Button
                  type="button"
                  variant="shadow"
                  color="primary"
                  size="sm"
                  onClick={() => setIsZoomOpen(true)}
                  className="absolute right-3 bottom-3 active:scale-[0.98] motion-reduce:transform-none"
                  aria-haspopup="dialog"
                >
                  <Maximize2 size={16} className="shrink-0" aria-hidden="true" />
                  <span className="hidden whitespace-nowrap sm:inline">확대</span>
                  <span className="sr-only sm:hidden">확대</span>
                </Button>
              )}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-5 rounded-2xl border border-dark-150 bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-dark-900">화면 정보</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs font-semibold text-dark-400">서비스</dt>
                <dd className="min-w-0 truncate font-semibold text-dark-900">{product.name}</dd>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs font-semibold text-dark-400">플랫폼</dt>
                <dd className="text-dark-900">{platformLabel}</dd>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs font-semibold text-dark-400">화면 유형</dt>
                <dd className="text-dark-900">{screenTypeLabel}</dd>
              </div>
              {product.summary !== null && product.summary.trim().length > 0 && (
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs font-semibold text-dark-400">서비스 소개</dt>
                  <dd className="text-sm leading-relaxed text-dark-700 break-words [word-break:keep-all]">
                    {product.summary}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-col gap-2">
              <Button
                as="a"
                href={`/?product=${encodeURIComponent(product.slug)}`}
                variant="contained"
                color="primary"
                size="md"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="whitespace-nowrap">이 서비스의 화면</span>
              </Button>
              <Button
                as="a"
                href={appHref}
                variant="shadow"
                color="primary"
                size="md"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="whitespace-nowrap">앱 상세 보기</span>
              </Button>
              <Button
                as="a"
                href={`https://darun.io/ko/products/${encodeURIComponent(product.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="shadow"
                color="primary"
                size="md"
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">서비스 소개</span>
              </Button>
              <Button
                type="button"
                variant="text"
                color="primary"
                size="md"
                onClick={() => router.back()}
                className="active:scale-[0.98] motion-reduce:transform-none"
              >
                <span className="whitespace-nowrap">뒤로 가기</span>
              </Button>
            </div>
          </aside>
        </div>

        {relatedScreenshots.length > 0 && (
          <section aria-labelledby="screenshot-related-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="screenshot-related-heading" className="text-lg font-bold text-dark-900">
                같은 앱의 다른 화면 ({relatedScreenshotTotalCount})
              </h2>
              <Link
                href={`/apps/${encodeURIComponent(product.slug)}`}
                className="shrink-0 rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                전체 보기 →
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {relatedScreenshots.map(item => (
                <li key={item.id}>
                  <Link
                    href={`/screenshots/${encodeURIComponent(item.id)}`}
                    className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title || `${product.name} 스크린샷`}
                        loading={VISUAL_CARD_IMAGE_LOADING}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                      />
                    </div>
                    {item.title && (
                      <div className="truncate p-2.5 text-xs font-semibold text-dark-900">{item.title}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {flows.length > 0 && (
          <section aria-labelledby="screenshot-flows-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="screenshot-flows-heading" className="text-lg font-bold text-dark-900">
                이 화면이 포함된 플로 ({flowTotalCount})
              </h2>
              <Link
                href={`/apps/${encodeURIComponent(product.slug)}`}
                className="shrink-0 rounded-lg text-sm font-semibold text-dark-500 transition-colors hover:text-dark-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
              >
                전체 보기 →
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {flows.map(flow => (
                <li key={flow.id}>
                  <Link
                    href={`/flows/${encodeURIComponent(flow.id)}`}
                    className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-surface-100">
                      <img
                        src={flow.coverImageUrl}
                        alt={flow.coverImageAlt || flow.title || `${product.name} 플로 커버`}
                        loading={VISUAL_CARD_IMAGE_LOADING}
                        className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3.5">
                      <span className="truncate text-sm font-bold text-dark-900">{flow.title}</span>
                      <span className="shrink-0 text-xs text-dark-500 tabular-nums">{flow.stepCount}단계</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Dialog
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        labelledBy="screenshot-zoom-heading"
        className="w-full"
      >
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col items-center gap-3 p-4">
          <h2
            id="screenshot-zoom-heading"
            className="max-w-full break-words [word-break:keep-all] text-base font-bold text-white"
          >
            {displayTitle}
          </h2>
          <div className="max-h-[calc(100dvh-9rem)] w-full overflow-y-auto overscroll-contain">
            <img src={imageUrl} alt={imageAlt} className="mx-auto max-w-full rounded-lg object-contain" />
          </div>
          <Button
            type="button"
            variant="contained"
            color="primary"
            size="sm"
            onClick={() => setIsZoomOpen(false)}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            <span className="whitespace-nowrap">닫기</span>
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export const ScreenshotDetail = bind((props: { id: string }) => ({ ...useScreenshotDetail(props.id) }), View, {
  displayName: 'ScreenshotDetail',
});
