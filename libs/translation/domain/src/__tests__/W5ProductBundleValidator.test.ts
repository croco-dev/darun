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
