import { describe, expect, it } from 'vitest';
import { buildUniqueDisplayName } from './buildUniqueDisplayName';

describe('buildUniqueDisplayName', () => {
  it('slug가 아닌 고유 public_id를 생성한다', () => {
    expect(buildUniqueDisplayName('linear', 'abc123')).toBe('linear-abc123');
  });

  it('같은 seed라도 접미사가 다르면 다른 public_id를 만든다', () => {
    const first = buildUniqueDisplayName('linear', 'aaa111');
    const second = buildUniqueDisplayName('linear', 'bbb222');
    expect(first).not.toBe(second);
    expect(first.startsWith('linear-')).toBe(true);
    expect(second.startsWith('linear-')).toBe(true);
  });

  it('서명 계약에 맞는 안전한 문자만 사용한다', () => {
    const displayName = buildUniqueDisplayName('Linear App 로고.png', 'Zz-99__@@');
    expect(displayName).toBe('linear-app-.png-zz99');
    expect(displayName).not.toMatch(/[\s/\\]/);
    expect(displayName.includes('..')).toBe(false);
  });

  it('빈 seed에서도 업로드 가능한 값을 만든다', () => {
    expect(buildUniqueDisplayName('   ', 'abc123')).toBe('image-abc123');
  });
});
