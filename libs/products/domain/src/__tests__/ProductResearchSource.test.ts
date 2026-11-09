import { describe, expect, it } from 'vitest';
import {
  hashSourceSnapshot,
  isAnchorExcerptPresent,
  normalizeResearchSources,
} from '../services/ProductResearchSource';

describe('normalizeResearchSources', () => {
  it('같은 URL의 빈 요약을 후속 발췌로 채우고 중복 없이 인용할 수 있게 보존한다', () => {
    const raw = [
      { title: '공식', url: 'https://linear.app/features/', description: '  ' },
      {
        title: '후속 공식',
        url: 'https://linear.app:443/features#pdf',
        description: ' PDF 문서를 검색합니다 ',
        extraSnippets: ['PDF 문서를 검색합니다', '팀과 문서를 공유합니다', '팀과\n문서를 공유합니다', '  '],
      },
      {
        title: '다른 출처',
        url: 'https://review.example/features',
        description: '별도 리뷰',
      },
      {
        title: '추가',
        url: 'https://linear.app/features',
        description: '권한을 관리합니다',
      },
    ];
    const sources = normalizeResearchSources(raw, 'linear.app');

    expect(sources).toEqual([
      {
        id: 's1',
        title: '공식',
        url: 'https://linear.app/features',
        hostname: 'linear.app',
        snippet: 'PDF 문서를 검색합니다',
        extraSnippets: ['팀과 문서를 공유합니다', '권한을 관리합니다'],
        relationToInput: 'INPUT_HOST_MATCH',
      },
      {
        id: 's2',
        title: '다른 출처',
        url: 'https://review.example/features',
        hostname: 'review.example',
        snippet: '별도 리뷰',
        extraSnippets: [],
        relationToInput: 'EXTERNAL',
      },
    ]);
    expect(isAnchorExcerptPresent('권한을 관리합니다', sources[0])).toBe(true);
    expect(isAnchorExcerptPresent('별도 리뷰', sources[0])).toBe(false);
    expect(normalizeResearchSources(raw, 'linear.app')).toEqual(sources);
    expect(hashSourceSnapshot(normalizeResearchSources(raw, 'linear.app'))).toBe(hashSourceSnapshot(sources));
    expect(hashSourceSnapshot(sources)).not.toBe(
      hashSourceSnapshot([{ ...sources[0], extraSnippets: [] }, sources[1]])
    );
  });

  it('발췌를 자른 뒤 중복을 제거하고 첫 요약과 추가 발췌 세 개의 순서를 유지한다', () => {
    const sources = normalizeResearchSources(
      [
        {
          title: '공식',
          url: 'https://linear.app',
          description: '첫 요약',
          extraSnippets: [' 첫 요약 ', '가'.repeat(701), '가'.repeat(700) + '나', '둘째 발췌'],
        },
        {
          title: '중복',
          url: 'https://linear.app/#top',
          description: '셋째 발췌',
          extraSnippets: ['넷째 발췌'],
        },
      ],
      'linear.app'
    );

    expect(sources).toHaveLength(1);
    expect(sources[0].snippet).toBe('첫 요약');
    expect(sources[0].extraSnippets).toEqual(['가'.repeat(700), '둘째 발췌', '셋째 발췌']);
  });

  it('15개 출처를 고른 뒤에도 25번째 입력까지 선택된 URL의 발췌를 병합한다', () => {
    const raw = Array.from({ length: 24 }, (_, index) => ({
      title: `출처 ${index + 1}`,
      url: `https://source${index + 1}.example/`,
      description: index === 0 ? '' : `요약 ${index + 1}`,
    }));
    raw.push({
      title: '후속',
      url: 'https://source1.example/#later',
      description: '마지막 유효 발췌',
    });
    raw.push({
      title: '상한 밖',
      url: 'https://source1.example/',
      description: '입력 상한 밖 발췌',
    });
    const sources = normalizeResearchSources(raw, 'source1.example');

    expect(sources.map(source => source.id)).toEqual(Array.from({ length: 15 }, (_, index) => `s${index + 1}`));
    expect(sources.map(source => source.url)).toEqual(
      Array.from({ length: 15 }, (_, index) => `https://source${index + 1}.example/`)
    );
    expect(sources[0].snippet).toBe('마지막 유효 발췌');
    expect(sources[0].extraSnippets).toEqual([]);
    expect(isAnchorExcerptPresent('입력 상한 밖 발췌', sources[0])).toBe(false);
  });

  it('dedupes canonical urls, caps sources, and marks input host matches exactly', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'A', url: 'https://linear.app/', description: 'plan' },
        { title: 'A dup', url: 'https://linear.app/#top', description: 'plan' },
        { title: 'Evil', url: 'https://linear.app.evil.org/', description: 'phishing' },
        { title: 'Bad', url: 'ftp://linear.app/file', description: 'ignored' },
        { title: 'Docs', url: 'https://docs.linear.app/features', description: 'features' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.id)).toEqual(['s1', 's2', 's3']);
    expect(sources[0]).toMatchObject({ url: 'https://linear.app/', relationToInput: 'INPUT_HOST_MATCH' });
    expect(sources[1]).toMatchObject({
      url: 'https://linear.app.evil.org/',
      relationToInput: 'EXTERNAL',
    });
    expect(sources[2]).toMatchObject({
      url: 'https://docs.linear.app/features',
      relationToInput: 'INPUT_HOST_MATCH',
    });
  });

  it('preserves non-default ports and strips canonical ones', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'Custom port', url: 'https://linear.app:8443/features', description: 'features on custom port' },
        { title: 'Default port', url: 'https://linear.app:443/features', description: 'canonical https' },
        { title: 'Distinct port host', url: 'https://linear.app/features', description: 'no port' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.url)).toEqual([
      'https://linear.app:8443/features',
      'https://linear.app/features',
    ]);
  });

  it('preserves ranked search order without promoting matching hostnames', () => {
    const sources = normalizeResearchSources(
      [
        { title: 'External', url: 'https://external.example/post', description: 'external facts' },
        { title: 'Official', url: 'https://linear.app/about', description: 'official facts' },
        { title: 'External 2', url: 'https://other.example/post', description: 'more facts' },
      ],
      'linear.app'
    );

    expect(sources.map(source => source.url)).toEqual([
      'https://external.example/post',
      'https://linear.app/about',
      'https://other.example/post',
    ]);
    expect(sources.map(source => source.id)).toEqual(['s1', 's2', 's3']);
  });
});

describe('isAnchorExcerptPresent', () => {
  it('accepts only excerpts copied from the cited source', () => {
    const [source] = normalizeResearchSources(
      [{ title: 'Linear', url: 'https://linear.app', description: 'Plan and track work' }],
      'linear.app'
    );
    if (!source) {
      throw new Error('expected one source');
    }

    expect(isAnchorExcerptPresent('track work', source)).toBe(true);
    expect(isAnchorExcerptPresent('free plan forever', source)).toBe(false);
    expect(isAnchorExcerptPresent('', source)).toBe(false);
  });
});
