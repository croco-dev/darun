const PRODUCT_INFO_MAX_LENGTH = 255;

export function getProductInfoLengthError(field: 'name' | 'summary', value: string | undefined): string | null {
  // PostgreSQL varchar(n) counts Unicode code points, rather than UTF-16 code units.
  if (value === undefined || [...value].length <= PRODUCT_INFO_MAX_LENGTH) return null;
  return `${field === 'name' ? '서비스 이름' : '짧은 설명'}은 ${PRODUCT_INFO_MAX_LENGTH}자 이하로 입력해주세요.`;
}

export function getProductSlugError(value: string | undefined): string | null {
  if (!value) return '슬러그를 입력해주세요.';
  if (value.length > 100) return '슬러그는 100자 이하로 입력해주세요.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return '슬러그는 소문자 영문·숫자를 하이픈(-) 하나로 연결해 입력해주세요.';
  }
  return null;
}
