import { describe, expect, it } from 'vitest';
import {
  createInitialWorkspaceState,
  newRequestId,
  parseTagsInput,
  parseWorkspaceState,
  prefillReviewFromResult,
  resolveLogoUrlForMaterialize,
  shouldStopResearchPolling,
} from '../features/products/ProductResearchSection/researchWorkspaceState';

describe('researchWorkspaceState', () => {
  it('새로고침 복구를 위해 저장된 Job과 편집값을 파싱한다', () => {
    const state = {
      version: 1,
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
      jobId: 'job-1',
      // 이전 버전이 저장한 전송 상태는 버리고 사용자 편집값만 복구한다.
      dispatchStatus: 'QUEUED',
      prefilledJobId: 'job-1',
      review: {
        name: 'Linear',
        slug: 'linear',
        summary: '요약',
        logoUrl: 'https://linear.app/logo.png',
        officialUrl: 'https://linear.app/',
        categoryIds: ['cat-1'],
        features: [{ name: '기능', summary: '설명', emoji: '✨' }],
        tags: ['협업'],
      },
      logoFileName: 'logo.png',
      uploadedLogoUrl: null,
      materializedSlug: null,
    };
    expect(parseWorkspaceState(JSON.stringify(state))).toEqual({
      version: 1,
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
      jobId: 'job-1',
      review: state.review,
      prefilledJobId: state.prefilledJobId,
      logoFileName: 'logo.png',
      uploadedLogoUrl: null,
      materializedSlug: null,
    });
  });

  it('이전 저장값에 업로드 URL이 없어도 Cloudinary 로고는 복구된다', () => {
    const withoutUploadedUrl = {
      version: 1,
      requestId: 'req-12345678',
      officialUrl: 'https://linear.app/',
      jobId: 'job-1',
      review: {
        name: 'Linear',
        slug: 'linear',
        summary: '요약',
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png',
        officialUrl: 'https://linear.app/',
        categoryIds: [],
        features: [],
        tags: [],
      },
      logoFileName: null,
      materializedSlug: null,
    };
    expect(parseWorkspaceState(JSON.stringify(withoutUploadedUrl))?.uploadedLogoUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/logo.png'
    );
  });

  it('손상된 저장값은 버리고 null을 반환한다', () => {
    expect(parseWorkspaceState(null)).toBeNull();
    expect(parseWorkspaceState('not json')).toBeNull();
    expect(parseWorkspaceState(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it('이미 편집된 값은 조사 결과로 덮어쓰지 않는다', () => {
    const prefilled = prefillReviewFromResult(
      {
        name: '내가 고친 이름',
        slug: '',
        summary: '',
        logoUrl: '',
        officialUrl: '',
        categoryIds: [],
        features: [],
        tags: [],
      },
      {
        name: { value: 'Linear' },
        suggestedSlug: 'linear',
        summary: { value: '조사 요약' },
        features: [{ name: 'f', summary: 's', emoji: '✨' }],
        tags: ['협업'],
      },
      'https://linear.app/'
    );
    expect(prefilled.name).toBe('내가 고친 이름');
    expect(prefilled.slug).toBe('linear');
    expect(prefilled.summary).toBe('조사 요약');
    expect(prefilled.features).toHaveLength(1);
    expect(prefilled.tags).toEqual(['협업']);
  });

  it('restores explicitly cleared fields without repopulating the same job', () => {
    const state = {
      ...createInitialWorkspaceState('req-12345678'),
      jobId: 'job-1',
      prefilledJobId: 'job-1',
    };
    const restored = parseWorkspaceState(JSON.stringify(state))!;
    const review = prefillReviewFromResult(
      restored.review,
      {
        name: { value: 'Original' },
        summary: { value: 'Original summary' },
        tags: ['original'],
        features: [{ name: 'Original feature' }],
      },
      'https://example.com',
      restored.prefilledJobId === restored.jobId
    );
    expect(review).toBe(restored.review);
    expect(review.name).toBe('');
    expect(review.summary).toBe('');
    expect(review.tags).toEqual([]);
    expect(review.features).toEqual([]);
  });

  it('요청 ID는 서버 requestId 형식을 만족한다', () => {
    expect(newRequestId()).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    expect(createInitialWorkspaceState(newRequestId()).requestId).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
    );
  });

  it('태그 입력은 중복 없이 정리된다', () => {
    expect(parseTagsInput('협업, 협업 , 생산성,,')).toEqual(['협업', '생산성']);
  });

  it('materialize 로고 URL은 선택 방식에 따라 결정된다', () => {
    expect(resolveLogoUrlForMaterialize({ kind: 'url', logoUrl: 'https://x/logo.png' }, null)).toBe(
      'https://x/logo.png'
    );
    expect(
      resolveLogoUrlForMaterialize({ kind: 'file', file: {} as File, fileName: 'logo.png' }, 'https://x/uploaded.png')
    ).toBe('https://x/uploaded.png');
    expect(resolveLogoUrlForMaterialize({ kind: 'file', file: {} as File, fileName: 'logo.png' }, null)).toBeNull();
    expect(resolveLogoUrlForMaterialize(null, 'https://x/uploaded.png')).toBeNull();
  });

  it('완료·실패 상태에서만 폴링을 멈춘다', () => {
    expect(shouldStopResearchPolling('completed')).toBe(true);
    expect(shouldStopResearchPolling('failed')).toBe(true);
    expect(shouldStopResearchPolling('pending')).toBe(false);
    expect(shouldStopResearchPolling('in_progress')).toBe(false);
    expect(shouldStopResearchPolling(null)).toBe(false);
  });
});
