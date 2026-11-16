export const MAGAZINE_BACKGROUND_FILE_ACCEPT = 'image/png,image/jpeg,image/webp,image/bmp,image/avif';

export function getMagazineBackgroundFileError(file: File) {
  if (!file.type.startsWith('image/')) return '이미지 파일만 업로드할 수 있습니다.';
  if (file.size > 10 * 1024 * 1024) return '10MB 이하의 이미지 파일만 업로드할 수 있습니다.';
  return null;
}
