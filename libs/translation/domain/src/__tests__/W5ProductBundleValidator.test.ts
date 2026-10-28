import { describe, expect, it } from 'vitest';
import { validateProductBundleTranslation } from '../validators/productBundleTranslationValidator';
const request = {
  name: '이름',
  summary: '',
  description: '',
  features: [
    { id: 'f-2', name: '둘', summary: '' },
    { id: 'f-1', name: '하나', summary: '조건' },
  ],
};
const response = {
  name: 'Name',
  summary: null,
  features: [
    { id: 'f-1', name: 'One', summary: 'Condition' },
    { id: 'f-2', name: 'Two', summary: '' },
  ],
};
describe('Bundle source completeness validator', () => {
  it('빈 optional만 정규화하며 응답 순서 대신 요청 ID 순서로 매핑한다', () => {
    expect(validateProductBundleTranslation(request, response)).toEqual({
      product: { name: 'Name', summary: '', description: '' },
      features: [
        { id: 'f-2', name: 'Two', summary: '' },
        { id: 'f-1', name: 'One', summary: 'Condition' },
      ],
    });
  });
  it('원문에 있는 optional의 누락/null/빈 값을 거부한다', () => {
    for (const summary of [undefined, null, '', '  '])
      expect(() =>
        validateProductBundleTranslation({ ...request, summary: '한계' }, { ...response, summary })
      ).toThrow();
  });
  it.each(['    코드\n\n본문  \n', '    코드만  \n', '본문  \n다음 줄  '])(
    '문서 description의 비어 있지 않은 공백을 보존한다: %j',
    description => {
      const result = validateProductBundleTranslation(
        { ...request, description },
        { ...response, name: '  Name  ', description }
      );
      expect(result.product.description).toBe(description);
      expect(result.product.name).toBe('Name');
    }
  );
  it('빈 optional 문서는 빈 문자열로 정규화하고 일반 텍스트는 계속 trim한다', () => {
    const result = validateProductBundleTranslation(
      { ...request, summary: '요약', description: ' \n\t' },
      { ...response, summary: '  Summary  ', description: ' \n\t' }
    );
    expect(result.product).toEqual({
      name: 'Name',
      summary: 'Summary',
      description: '',
    });
    for (const description of [undefined, null, '', ' \n\t'])
      expect(() =>
        validateProductBundleTranslation({ ...request, description: '본문' }, { ...response, description })
      ).toThrow();
  });
  it('원문이 없는 optional에 새 내용을 만들지 않는다', () => {
    expect(() => validateProductBundleTranslation(request, { ...response, description: 'Invented claim' })).toThrow();
  });
  it('요청 자체의 중복 ID와 잘못된 ID 길이를 거부한다', () => {
    expect(() =>
      validateProductBundleTranslation({ ...request, features: [request.features[0]!, request.features[0]!] }, response)
    ).toThrow(/중복/);
    expect(() =>
      validateProductBundleTranslation(
        { ...request, features: [{ id: 'x'.repeat(27), name: '이름', summary: '' }] },
        response
      )
    ).toThrow(/길이/);
  });
});
