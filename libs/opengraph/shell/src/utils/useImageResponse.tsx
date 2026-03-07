import { ImageResponse } from 'next/og';
import { ReactElement } from 'react';
import { getPretendardFontSet } from './fonts';

export async function useImageResponse(
  element: ReactElement,
  options?: {
    size?: {
      width: number;
      height: number;
    };
  }
) {
  const size = options?.size || { width: 1200, height: 630 };
  const pretendardFontSet = await getPretendardFontSet();

  return new ImageResponse(element, {
    ...size,
    fonts: [...pretendardFontSet],
  });
}
