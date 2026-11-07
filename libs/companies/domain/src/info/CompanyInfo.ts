const COMPANY_INFO_FIELDS = {
  name: { subject: '회사 이름은', maxLength: 100 },
  type: { subject: '유형은', maxLength: 20 },
  address: { subject: '주소는', maxLength: 200 },
};

export function getCompanyInfoLengthError(field: 'name' | 'type' | 'address', value: string): string | null {
  const { subject, maxLength } = COMPANY_INFO_FIELDS[field];
  // PostgreSQL varchar(n) counts Unicode code points, rather than UTF-16 code units.
  return [...value].length > maxLength ? `${subject} ${maxLength}자 이하로 입력해주세요.` : null;
}
