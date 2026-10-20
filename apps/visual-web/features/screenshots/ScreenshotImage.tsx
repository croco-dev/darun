'use client';

import { ImageOff } from '@darun/ui';
import { useState } from 'react';
import { isVisualPlatformValue } from './visualClassifications';

export type ScreenshotImageVariant = 'card' | 'thumb';

type ScreenshotImageProps = {
  src: string;
  alt: string;
  /** Raw platform value; null/unknown renders at the image's own ratio without implying a platform. */
  platform: string | null;
  variant?: ScreenshotImageVariant;
};

function ScreenshotImageFallback({ variant, label }: { variant: ScreenshotImageVariant; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={
        variant === 'thumb'
          ? 'flex min-h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-dark-400'
          : 'flex min-h-28 w-full flex-col items-center justify-center gap-1 bg-surface-100 px-3 py-8 text-dark-400'
      }
    >
      <ImageOff size={20} className="shrink-0" aria-hidden="true" />
      {variant === 'card' ? <span className="text-xs text-dark-500">이미지를 불러올 수 없어요.</span> : null}
    </div>
  );
}

// Uncropped everywhere (object-contain). Known platforms keep their intended
// ratio; unknown platforms use the file's own dimensions so a landscape
// desktop capture renders landscape instead of a default phone ratio.
export function ScreenshotImage({ src, alt, platform, variant = 'card' }: ScreenshotImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return <ScreenshotImageFallback variant={variant} label={alt} />;
  }
  const handleError = () => setFailedSrc(src);
  if (platform !== null && isVisualPlatformValue(platform)) {
    const landscape = platform === 'WEB';
    const frameClass =
      variant === 'thumb'
        ? landscape
          ? 'aspect-[16/10] w-28'
          : 'aspect-[9/19.5] w-14'
        : `${landscape ? 'aspect-[16/10]' : 'aspect-[9/19.5]'} max-h-112 w-full`;
    return (
      <div
        className={`${frameClass} shrink-0 overflow-hidden bg-surface-100 ${
          variant === 'thumb' ? 'rounded-lg' : 'rounded-t-xl'
        }`}
      >
        <img src={src} alt={alt} loading="lazy" onError={handleError} className="block h-full w-full object-contain" />
      </div>
    );
  }
  if (variant === 'thumb') {
    return (
      <div className="flex min-h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-100">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={handleError}
          className="h-auto max-h-40 w-auto max-w-full object-contain"
        />
      </div>
    );
  }
  return (
    <div className="min-h-28 w-full bg-surface-100">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleError}
        className="block h-auto max-h-112 w-full object-contain"
      />
    </div>
  );
}
