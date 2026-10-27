import { describe, expect, it, vi } from 'vitest';
import { SynonymExpander } from '../services/SynonymExpander';

vi.mock('../services/SearchSynonyms', () => ({
  SEARCH_SYNONYM_MAP: {
    red: ['rouge'],
    'red blue': ['purple', 'shared'],
    'RED  blue\tgreen': ['rainbow'],
    green: ['vert'],
    loop: ['cycle'],
    cycle: ['echo'],
  },
}));

describe('SynonymExpander의 중첩 사전', () => {
  it('가장 긴 구를 먼저 소비하고 나머지 입력만 이어서 확장한다', () => {
    expect(new SynonymExpander().expand('start Red blue GREEN red blue greenish end')).toBe(
      'start Red blue GREEN rainbow red blue purple shared greenish end'
    );
  });

  it('짧은 단어와 부분 구는 경계를 지키고 중복 동의어를 제거한다', () => {
    expect(new SynonymExpander().expand('red blueish green red blue purple')).toBe(
      'red rouge blueish green vert red blue purple shared'
    );
  });

  it('추가한 동의어는 다시 확장하지 않는다', () => {
    expect(new SynonymExpander().expand('loop')).toBe('loop cycle');
  });
});
