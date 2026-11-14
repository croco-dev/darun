'use client';

import { type ComponentProps, useState } from 'react';

const CARD_WIDTHS = [128, 256, 384, 512, 768, 1024, 1536];
const THUMBNAIL_WIDTHS = [96, 192];
// Cloudinary's public, versioned raster upload URL. Existing transformations,
// signatures and other delivery types may have their own URL requirements.
const PUBLIC_UPLOAD =
  /^(https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/)(v\d+\/[^?#\s,]+\.(?:png|jpe?g|webp))$/i;

type Props = Readonly<
  Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'sizes' | 'alt'> & {
    src: string;
    alt: string;
    sizes: string;
    thumbnail?: boolean;
  }
>;

export function ResponsiveScreenshotImage({ src, alt, sizes, thumbnail, onError, ...props }: Props) {
  const [failedSource, setFailedSource] = useState<string>();
  const upload = src !== failedSource && PUBLIC_UPLOAD.exec(src);
  const widths = thumbnail ? THUMBNAIL_WIDTHS : CARD_WIDTHS;
  const srcSet = upload
    ? widths.map(width => `${upload[1]}c_limit,w_${width}/f_auto/q_auto/${upload[2]} ${width}w`).join(', ')
    : undefined;

  return (
    <img
      {...props}
      alt={alt}
      sizes={srcSet ? sizes : undefined}
      srcSet={srcSet}
      src={src}
      onError={event => {
        if (srcSet) {
          setFailedSource(src);
        } else {
          onError?.(event);
        }
      }}
    />
  );
}
