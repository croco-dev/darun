'use client';

import { ImageOff } from '@darun/ui';
import { useState } from 'react';

type ScreenshotImageProps = {
  src: string;
  alt: string;
};

export function ScreenshotImage({ src, alt }: ScreenshotImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex min-h-28 w-full items-center justify-center rounded-lg bg-surface-100 text-dark-400"
      >
        <ImageOff size={20} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className="block h-auto w-full rounded-lg"
    />
  );
}
