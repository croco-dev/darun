'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { isDarunImageRemoteUrl } from '../../image-origins.cjs';

type LogoImageProps = Pick<ImageProps, 'alt' | 'width' | 'height' | 'className' | 'aria-hidden'> & {
  src?: string | null;
  fallbackSrc: string;
};

function canOptimizeLogo(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    return isDarunImageRemoteUrl(new URL(src));
  } catch {
    return false;
  }
}

export function LogoImage({ src, fallbackSrc, ...props }: LogoImageProps) {
  const [previousSrc, setPreviousSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  if (previousSrc !== src) {
    setPreviousSrc(src);
    setHasError(false);
  }
  const resolvedSrc = !src || hasError ? fallbackSrc : src;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      unoptimized={resolvedSrc === fallbackSrc || !canOptimizeLogo(resolvedSrc)}
      onError={() => setHasError(true)}
    />
  );
}
