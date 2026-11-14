'use client';

import { Button, ImageOff, Maximize2, RefreshCw } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useRef, useState } from 'react';
import { VISUAL_DETAIL_IMAGE_FETCH_PRIORITY } from '../perf/imageLoading';
import { ResponsiveScreenshotImage } from './ResponsiveScreenshotImage';

type ScreenshotImageProps = {
  src: string;
  alt: string;
  variant?: 'card' | 'detail' | 'step';
  href?: string;
  linkLabel?: string;
  cardSizes?: string;
  onZoom?: () => void;
};

// A new source owns its own load result; a late event from the previous image cannot change it.
export function ScreenshotImage(props: ScreenshotImageProps) {
  return <ImageRequest key={props.src} {...props} />;
}

function ImageRequest({
  src,
  alt,
  variant = 'card',
  href,
  linkLabel,
  onZoom,
  cardSizes = '50vw',
}: ScreenshotImageProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'loaded'>('loading');
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const retryControlRef = useRef<HTMLButtonElement | null>(null);
  const isCard = variant === 'card';
  const pendingRetry = attempt > 0 && status === 'loading';
  const imageProps = {
    ref: imageRef,
    src,
    alt,
    tabIndex: -1,
    onLoad: () => {
      setStatus('loaded');
      if (
        attempt > 0 &&
        (document.activeElement === retryControlRef.current || document.activeElement === document.body)
      ) {
        imageRef.current?.focus({ preventScroll: true });
      }
    },
    onError: () => setStatus('error'),
  };
  const image =
    status !== 'error' &&
    (isCard ? (
      <ResponsiveScreenshotImage
        key={attempt}
        {...imageProps}
        sizes={cardSizes}
        loading="lazy"
        className="block h-auto w-full rounded-lg"
      />
    ) : (
      <img
        key={attempt}
        {...imageProps}
        fetchPriority={VISUAL_DETAIL_IMAGE_FETCH_PRIORITY}
        className={
          variant === 'detail'
            ? 'mx-auto max-h-[78dvh] w-auto max-w-full object-contain'
            : 'mx-auto max-h-[calc(100dvh-16rem)] w-auto max-w-full rounded-xl bg-surface-100 object-contain'
        }
      />
    ));

  const showFallback = status === 'error' || pendingRetry;
  const preview = (
    <>
      {image}
      {showFallback && (
        <div className="flex flex-col items-center gap-2">
          <ImageOff size={isCard ? 20 : 32} aria-hidden="true" />
          <p role="status" className="text-center text-sm text-dark-600 break-words [word-break:keep-all]">
            {pendingRetry ? '이미지를 다시 불러오는 중이에요.' : '이미지를 불러올 수 없어요.'}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div
      className={`relative min-w-0 ${showFallback ? `flex w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-100 p-3 text-dark-400 ${isCard ? 'min-h-28' : 'min-h-72'}` : ''}`}
      aria-busy={pendingRetry}
    >
      {href ? (
        <Link
          href={href}
          aria-label={linkLabel}
          className="block w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900"
        >
          {preview}
        </Link>
      ) : (
        preview
      )}
      {showFallback && (
        <Button
          type="button"
          variant="shadow"
          color="secondary"
          size="sm"
          disabled={pendingRetry}
          onClick={event => {
            retryControlRef.current = event.currentTarget;
            setStatus('loading');
            setAttempt(value => value + 1);
          }}
          className="min-h-[44px] max-w-full flex-wrap gap-1.5"
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span className="min-w-0 break-words">이미지 다시 시도</span>
        </Button>
      )}
      {onZoom && status === 'loaded' && (
        <Button
          type="button"
          variant="shadow"
          color="secondary"
          size="sm"
          onClick={onZoom}
          aria-haspopup="dialog"
          className="absolute right-3 bottom-3 min-h-[44px] min-w-[44px] gap-1.5"
        >
          <Maximize2 size={16} aria-hidden="true" />
          <span>확대</span>
        </Button>
      )}
    </div>
  );
}
