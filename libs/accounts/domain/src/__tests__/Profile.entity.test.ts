import { describe, expect, it } from 'vitest';
import { Profile } from '../entities/Profile';

describe('Profile', () => {
  describe('constructor', () => {
    it('id와 displayName이 주어지면 그대로 설정된다', () => {
      const profile = new Profile({ id: 'user-1', displayName: '홍길동' });
      expect(profile.id).toBe('user-1');
      expect(profile.displayName).toBe('홍길동');
    });

    it('displayName이 없으면 기본값 "-"이 설정된다', () => {
      const profile = new Profile({ id: 'user-2' });
      expect(profile.displayName).toBe('-');
    });

    it('id가 없으면 id 속성이 설정되지 않는다', () => {
      const profile = new Profile({ displayName: '테스트' });
      expect(profile.id).toBeUndefined();
    });
  });
});
