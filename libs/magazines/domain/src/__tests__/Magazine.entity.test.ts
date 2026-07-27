import { describe, expect, it } from 'vitest';
import { Magazine } from '../entities/Magazine';

function createTestMagazine(overrides: Partial<ConstructorParameters<typeof Magazine>[0]> = {}) {
  return new Magazine({
    title: '테스트 매거진',
    backgroundImageUrl: 'https://example.com/bg.png',
    authorId: 'author-1',
    ...overrides,
  });
}

describe('Magazine', () => {
  describe('constructor', () => {
    it('id가 없으면 id 속성이 설정되지 않는다', () => {
      const magazine = createTestMagazine();
      expect(magazine.id).toBeUndefined();
    });

    it('id가 주어지면 그대로 설정된다', () => {
      const magazine = createTestMagazine({ id: 'mag-1' });
      expect(magazine.id).toBe('mag-1');
    });

    it('slug가 없으면 title 기반으로 자동 생성된다', () => {
      const magazine = createTestMagazine({ title: 'Hello World' });
      expect(magazine.slug).toBe('hello-world');
    });

    it('slug가 주어지면 그대로 설정된다', () => {
      const magazine = createTestMagazine({ slug: 'custom-slug' });
      expect(magazine.slug).toBe('custom-slug');
    });

    it('초기에 publishedAt이 없다', () => {
      const magazine = createTestMagazine();
      expect(magazine.publishedAt).toBeUndefined();
    });
  });

  describe('publish', () => {
    it('publish 호출 시 publishedAt이 현재 날짜로 설정된다', () => {
      const before = new Date();
      const magazine = createTestMagazine();
      magazine.publish();
      const after = new Date();

      expect(magazine.publishedAt).toBeInstanceOf(Date);
      expect(magazine.publishedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(magazine.publishedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('update', () => {
    it('전달된 필드만 업데이트된다', () => {
      const magazine = createTestMagazine({ title: '원본 제목', slug: 'original-slug' });
      magazine.update({ title: '수정된 제목' });

      expect(magazine.title).toBe('수정된 제목');
      expect(magazine.slug).toBe('original-slug');
    });

    it('update 호출 시 updatedAt이 설정된다', () => {
      const magazine = createTestMagazine();
      expect(magazine.updatedAt).toBeUndefined();
      magazine.update({ title: '새 제목' });
      expect(magazine.updatedAt).toBeInstanceOf(Date);
    });

    it('backgroundImageUrl과 logoImageUrl을 업데이트할 수 있다', () => {
      const magazine = createTestMagazine();
      magazine.update({
        backgroundImageUrl: 'https://example.com/new-bg.png',
        logoImageUrl: 'https://example.com/logo.png',
      });

      expect(magazine.backgroundImageUrl).toBe('https://example.com/new-bg.png');
      expect(magazine.logoImageUrl).toBe('https://example.com/logo.png');
    });
  });
});
