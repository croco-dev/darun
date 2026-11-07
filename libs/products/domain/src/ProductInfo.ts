const PRODUCT_INFO_MAX_LENGTH = 255;

export function getProductInfoLengthError(field: 'name' | 'summary', value: string | undefined): string | null {
  // PostgreSQL varchar(n) counts Unicode code points, rather than UTF-16 code units.
  if (value === undefined || [...value].length <= PRODUCT_INFO_MAX_LENGTH) return null;
  return `${field === 'name' ? '서비스 이름' : '짧은 설명'}은 ${PRODUCT_INFO_MAX_LENGTH}자 이하로 입력해주세요.`;
}
