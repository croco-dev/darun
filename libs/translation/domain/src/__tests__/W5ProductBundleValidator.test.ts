import { describe, expect, it } from 'vitest';
import { validateProductBundleTranslation } from '../validators/productBundleTranslationValidator';

describe('productBundleTranslationValidator', () => {
  const request = {
    features: [
      { id: 'f-1', name: '기능1', summary: '요약1' },
      { id: 'f-2', name: '기능2', summary: '요약2' },
    ],
  };

  it('합법적인 빈 선택 설명을 받아들이고 요청 순서대로 정규화한다', () => {
    const validated = validateProductBundleTranslation(request, {
      name: '  Name  ',
      summary: '',
      description: null,
      features: [
        { id: 'f-2', name: '  F2  ', summary: '' },
        { id: 'f-1', name: 'F1', summary: null },
      ],
    });

    expect(validated).toEqual({
      product: { name: 'Name', summary: '', description: '' },
      features: [
        { id: 'f-1', name: 'F1', summary: '' },
        { id: 'f-2', name: 'F2', summary: '' },
      ],
    });
  });

  it('중복·미지·누락 ID와 빈 필수명을 각각 거부한다', () => {
    const validFeature = { id: 'f-1', name: 'F1', summary: 'S1' };
    expect(() =>
      validateProductBundleTranslation(request, {
        name: 'Name',
        description: 'Desc',
        features: [validFeature, { id: 'f-1', name: 'F1-dup', summary: 'S1-dup' }],
      })
    ).toThrow(/중복된 기능 ID\(f-1\)/);

    expect(() =>
      validateProductBundleTranslation(request, {
        name: 'Name',
        description: 'Desc',
        features: [{ id: 'f-evil', name: 'Evil', summary: 'Evil' }],
      })
    ).toThrow(/알 수 없는 기능 ID\(f-evil\)/);

    expect(() =>
      validateProductBundleTranslation(request, {
        name: 'Name',
        description: 'Desc',
        features: [validFeature],
      })
    ).toThrow(/요청된 기능 ID\(f-2\)가 누락/);

    expect(() =>
      validateProductBundleTranslation(request, {
        name: '   ',
        description: 'Desc',
        features: [validFeature, { id: 'f-2', name: 'F2', summary: 'S2' }],
      })
    ).toThrow(/name이 누락/);

    expect(() =>
      validateProductBundleTranslation(request, {
        name: 'Name',
        description: 'Desc',
        features: [{ id: 'f-1', name: '   ', summary: 'S1' }],
      })
    ).toThrow(/기능\(f-1\) name이 누락/);
  });
});
