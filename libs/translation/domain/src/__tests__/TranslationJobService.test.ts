import { describe, expect, it } from 'vitest';
import { translationFields } from '../ports/TranslationSourceStore';

describe('Persisted translation field contract', () => {
  it('legacy NULL fields는 Product bundle 읽기로만 해석한다', () => {
    expect(translationFields({ entityType: 'Product', entityId: 'p1', fields: null })).toEqual([
      'name',
      'summary',
      'description',
      'features',
    ]);
    for (const entityType of ['Magazine', 'ProductFeature'] as const)
      expect(() => translationFields({ entityType, entityId: 'id', fields: null })).toThrow(/legacy Product/);
  });
  it('명시 fields의 순서/집합을 보존하고 중복을 정리한다', () => {
    expect(
      translationFields({ entityType: 'Magazine', entityId: 'm1', fields: ['content', 'title', 'content'] })
    ).toEqual(['content', 'title']);
  });
  it('빈/알 수 없는 fields를 bundle로 오해하지 않는다', () => {
    for (const fields of [[], ['slug'], ['name', 'unknown']])
      expect(() => translationFields({ entityType: 'Product', entityId: 'p1', fields })).toThrow(
        /Invalid translation fields/
      );
  });
});
