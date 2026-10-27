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

  it.each([
    ['screen..final.png', 'screen-final.png-abc123'],
    ['screen...draft..final.png', 'screen-draft-final.png-abc123'],
    ['화면.. 최종.png', 'png-abc123'],
    ['screen..-final.png', 'screen-final.png-abc123'],
  ])('연속 점을 포함한 파일명 %s를 안전한 public_id로 만든다', (seed, expected) => {
    expect(buildUniqueDisplayName(seed, 'abc123')).toBe(expected);
  });

  it('정상 파일명의 단일 점과 여러 확장자는 보존한다', () => {
    expect(buildUniqueDisplayName('screen.final.backup.png', 'abc123')).toBe('screen.final.backup.png-abc123');
  });

  it('긴 파일명을 잘라도 연속 점이 남지 않고 고유 접미사를 유지한다', () => {
    const displayName = buildUniqueDisplayName(`${'a'.repeat(62)}..final.png`, 'abc123');
    expect(displayName).not.toContain('..');
    expect(displayName.endsWith('-abc123')).toBe(true);
    expect(displayName.length).toBeLessThanOrEqual(120);
  });
});
