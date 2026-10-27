import { describe, expect, it } from 'vitest';
import { SynonymExpander } from '../services/SynonymExpander';

describe('SynonymExpander', () => {
  it.each([
    ['mouse', 'mouse 마우스 포인팅 디바이스'],
    ['마우스', '마우스 mouse 포인팅 디바이스'],
    ['포인팅 디바이스', '포인팅 디바이스 마우스 mouse'],
  ])('%s를 입력하면 같은 동의어 그룹을 포함한다', (query, expected) => {
    expect(new SynonymExpander().expand(query)).toBe(expected);
  });

  it('여러 공백을 정규화하고 구 앞뒤의 원문과 대소문자를 보존한다', () => {
    expect(new SynonymExpander().expand('  Wireless\t포인팅 \n 디바이스  USB  ')).toBe(
      'Wireless 포인팅 디바이스 마우스 mouse USB'
    );
  });

  it('구와 단어가 반복되어도 각 동의어는 처음 나타난 표기만 남긴다', () => {
    expect(new SynonymExpander().expand('Mouse 포인팅 디바이스 mouse 마우스')).toBe('Mouse 마우스 포인팅 디바이스');
  });

  it('부분 문자열이나 인접하지 않은 단어는 구로 확장하지 않는다', () => {
    expect(new SynonymExpander().expand('포인팅 디바이스용 포인팅 무선 디바이스 mousepad')).toBe(
      '포인팅 디바이스용 무선 디바이스 mousepad'
    );
  });

  it('공백만 있는 검색어는 빈 문자열을 반환한다', () => {
    expect(new SynonymExpander().expand(' \t\n ')).toBe('');
  });
});
