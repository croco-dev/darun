export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const MAX_REDACTION_REGIONS = 20;
const MAX_REDACTION_PIXELS = 20_000_000;

export interface RedactionRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const INVALID_IMAGE = '이미지를 읽을 수 없습니다. 올바른 PNG, JPEG, WebP 파일을 선택해주세요.';
const ANIMATED_IMAGE = '움직이는 이미지는 가릴 수 없습니다. 정지 이미지를 선택해주세요.';
const LARGE_IMAGE = '가림 편집은 2천만 픽셀 이하의 이미지에서 사용할 수 있습니다.';

function pngDimensions(bytes: DataView): ImageDimensions {
  if (
    bytes.getUint32(0) !== 0x89504e47 ||
    bytes.getUint32(4) !== 0x0d0a1a0a ||
    bytes.getUint32(8) !== 13 ||
    bytes.getUint32(12) !== 0x49484452 // IHDR
  ) {
    throw new Error(INVALID_IMAGE);
  }

  for (let offset = 8; offset + 12 <= bytes.byteLength;) {
    const length = bytes.getUint32(offset);
    const kind = bytes.getUint32(offset + 4);
    offset += length + 12;
    if (offset > bytes.byteLength) break;
    // APNG animation control, frame control, or frame data.
    if (kind === 0x6163544c || kind === 0x6663544c || kind === 0x66644154) {
      throw new Error(ANIMATED_IMAGE);
    }
    if (kind === 0x49454e44 && length === 0 && offset === bytes.byteLength) {
      return { width: bytes.getUint32(16), height: bytes.getUint32(20) };
    }
  }
  throw new Error(INVALID_IMAGE);
}

function jpegDimensions(bytes: DataView): ImageDimensions {
  if (bytes.getUint16(0) !== 0xffd8) throw new Error(INVALID_IMAGE);
  for (let offset = 2; offset + 4 <= bytes.byteLength;) {
    if (bytes.getUint8(offset++) !== 0xff) break;
    while (offset < bytes.byteLength && bytes.getUint8(offset) === 0xff) offset++;
    if (offset + 3 > bytes.byteLength) break;
    const marker = bytes.getUint8(offset++);
    if (marker === 0xda || marker === 0xd9) break; // Start of scan or end of image.
    const length = bytes.getUint16(offset);
    if (length < 2 || offset + length > bytes.byteLength) break;
    // Baseline, extended sequential, and progressive JPEG.
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 8) break;
      return { width: bytes.getUint16(offset + 5), height: bytes.getUint16(offset + 3) };
    }
    offset += length;
  }
  throw new Error(INVALID_IMAGE);
}

function webpDimensions(bytes: DataView): ImageDimensions {
  if (
    bytes.getUint32(0) !== 0x52494646 || // RIFF
    bytes.getUint32(8) !== 0x57454250 || // WEBP
    bytes.getUint32(4, true) !== bytes.byteLength - 8
  ) {
    throw new Error(INVALID_IMAGE);
  }

  let canvas: ImageDimensions | undefined;
  let image: ImageDimensions | undefined;
  let offset = 12;
  for (; offset + 8 <= bytes.byteLength;) {
    const kind = bytes.getUint32(offset);
    const length = bytes.getUint32(offset + 4, true);
    const start = offset + 8;
    offset = start + length + (length % 2);
    if (offset > bytes.byteLength) throw new Error(INVALID_IMAGE);

    switch (kind) {
      case 0x414e494d: // ANIM
      case 0x414e4d46: // ANMF
        throw new Error(ANIMATED_IMAGE);
      case 0x56503858: // VP8X
        if (length !== 10 || canvas) throw new Error(INVALID_IMAGE);
        if (bytes.getUint8(start) & 0x02) throw new Error(ANIMATED_IMAGE);
        canvas = {
          width: (bytes.getUint32(start + 4, true) & 0xffffff) + 1,
          height: (bytes.getUint32(start + 6, true) >>> 8) + 1,
        };
        break;
      case 0x56503820: // VP8
        if (length < 10 || image || (bytes.getUint32(start + 2) & 0xffffff) !== 0x9d012a) {
          throw new Error(INVALID_IMAGE);
        }
        image = { width: bytes.getUint16(start + 6, true) & 0x3fff, height: bytes.getUint16(start + 8, true) & 0x3fff };
        break;
      case 0x5650384c: {
        // VP8L
        if (length < 5 || image || bytes.getUint8(start) !== 0x2f) throw new Error(INVALID_IMAGE);
        const dimensions = bytes.getUint32(start + 1, true);
        image = { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
        break;
      }
    }
  }

  if (
    !image ||
    offset !== bytes.byteLength ||
    (canvas && (canvas.width !== image.width || canvas.height !== image.height))
  ) {
    throw new Error(INVALID_IMAGE);
  }
  return image;
}

function checkPixelCount({ width, height }: ImageDimensions) {
  if (width < 1 || height < 1) throw new Error(INVALID_IMAGE);
  if (width * height > MAX_REDACTION_PIXELS) throw new Error(LARGE_IMAGE);
}

export async function decodeScreenshotForRedaction(file: File): Promise<ImageBitmap> {
  if (file.size > MAX_SCREENSHOT_BYTES) throw new Error('스크린샷 이미지는 10MB 이하만 업로드할 수 있습니다.');
  if (file.type === 'image/apng') throw new Error(ANIMATED_IMAGE);
  const bytes = new DataView(await file.arrayBuffer());

  try {
    switch (file.type) {
      case 'image/png':
        checkPixelCount(pngDimensions(bytes));
        break;
      case 'image/jpeg':
        checkPixelCount(jpegDimensions(bytes));
        break;
      case 'image/webp':
        checkPixelCount(webpDimensions(bytes));
        break;
      default:
        throw new Error(INVALID_IMAGE);
    }
  } catch (error) {
    if (error instanceof RangeError) throw new Error(INVALID_IMAGE);
    throw error;
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new Error(INVALID_IMAGE);
  });
  try {
    checkPixelCount(bitmap);
  } catch (error) {
    bitmap.close();
    throw error;
  }
  return bitmap;
}

export function isRedactionRegionInside(
  { left, top, right, bottom }: RedactionRegion,
  { width, height }: ImageDimensions
) {
  return (
    [left, top, right, bottom].every(Number.isInteger) &&
    left >= 0 &&
    top >= 0 &&
    right <= width &&
    bottom <= height &&
    left < right &&
    top < bottom
  );
}

export async function createRedactedScreenshot(
  bitmap: ImageBitmap,
  regions: readonly RedactionRegion[]
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  try {
    const context = canvas.getContext('2d');
    if (!context || !regions.length || regions.length > MAX_REDACTION_REGIONS) {
      throw new Error('가림 결과를 만들 수 없습니다.');
    }

    context.drawImage(bitmap, 0, 0);
    context.fillStyle = '#000';
    for (const { left, top, right, bottom } of regions) {
      if (!isRedactionRegionInside({ left, top, right, bottom }, bitmap)) {
        throw new Error('가림 영역이 이미지 범위를 벗어났습니다.');
      }
      context.fillRect(left, top, right - left, bottom - top);
    }

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob || blob.type !== 'image/png') throw new Error('가림 결과를 만들 수 없습니다.');
    if (blob.size > MAX_SCREENSHOT_BYTES) throw new Error('가림 결과가 10MB를 초과합니다.');
    return new File([blob], 'redacted-screenshot.png', { type: 'image/png' });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
