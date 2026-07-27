import { describe, expect, it } from 'vitest';
import { Vote } from '../entities/Vote';

describe('Vote', () => {
  describe('constructor', () => {
    it('id와 count가 주어지면 그대로 설정된다', () => {
      const vote = new Vote({ id: 'vote-1', targetId: 'prod-1', count: 10 });
      expect(vote.id).toBe('vote-1');
      expect(vote.targetId).toBe('prod-1');
      expect(vote.count).toBe(10);
    });

    it('count가 없으면 0으로 초기화된다', () => {
      const vote = new Vote({ targetId: 'prod-1' });
      expect(vote.count).toBe(0);
    });

    it('id가 없으면 id 속성이 설정되지 않는다', () => {
      const vote = new Vote({ targetId: 'prod-1' });
      expect(vote.id).toBeUndefined();
    });
  });

  describe('upvote', () => {
    it('upvote 호출 시 count가 1 증가한다', () => {
      const vote = new Vote({ targetId: 'prod-1', count: 5 });
      vote.upvote();
      expect(vote.count).toBe(6);
    });
  });
});
