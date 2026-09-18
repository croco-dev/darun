import {
  isVisualPlatform,
  isVisualScreenType,
  type VisualPlatform,
  type VisualScreenType,
} from '../entities/VisualClassification';
import { productInvalidArgs } from '../errors/productError';

const TITLE_MAX_LENGTH = 100;
const IMAGE_ALT_MAX_LENGTH = 100;
export const VISUAL_QUERY_MAX_LENGTH = 100;

export function normalizeScreenshotTitle(title: string | null | undefined): string | null {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw productInvalidArgs('스크린샷 제목은 100자 이하로 입력해 주세요.');
  }
  return trimmed;
}

export function normalizeScreenshotImageAlt(imageAlt: string | null | undefined): string {
  const trimmed = typeof imageAlt === 'string' ? imageAlt.trim() : '';
  if (trimmed.length < 1 || trimmed.length > IMAGE_ALT_MAX_LENGTH) {
    throw productInvalidArgs('이미지 대체 텍스트(alt)는 1자 이상 100자 이하로 입력해 주세요.');
  }
  return trimmed;
}

export function normalizeVisualPlatform(platform: string | null | undefined): VisualPlatform | null {
  if (platform === null || platform === undefined || platform === '') {
    return null;
  }
  if (!isVisualPlatform(platform)) {
    throw productInvalidArgs('지원하지 않는 플랫폼 값입니다.');
  }
  return platform;
}

export function normalizeVisualScreenType(screenType: string | null | undefined): VisualScreenType | null {
  if (screenType === null || screenType === undefined || screenType === '') {
    return null;
  }
  if (!isVisualScreenType(screenType)) {
    throw productInvalidArgs('지원하지 않는 화면 유형 값입니다.');
  }
  return screenType;
}

export function normalizeVisualQuery(query: string | null | undefined): string {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length > VISUAL_QUERY_MAX_LENGTH) {
    throw productInvalidArgs('검색어는 100자 이하로 입력해 주세요.');
  }
  return trimmed;
}
