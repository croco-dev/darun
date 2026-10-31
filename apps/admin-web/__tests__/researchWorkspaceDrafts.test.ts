// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  listWorkspaceDrafts,
  readWorkspaceDraft,
  saveWorkspaceDraft,
} from '../features/products/ProductResearchSection/researchWorkspaceDrafts';
import {
  RESEARCH_WORKSPACE_STORAGE_KEY,
  createInitialWorkspaceState,
} from '../features/products/ProductResearchSection/researchWorkspaceState';

function sessionStore(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: key => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
}

const workspace = (jobId: string | null, name: string) => ({
  ...createInitialWorkspaceState('request-123'),
  jobId,
  prefilledJobId: jobId,
  review: {
    ...createInitialWorkspaceState('unused').review,
    name,
    summary: '원래 요약',
  },
});

beforeEach(() => localStorage.clear());

describe('research workspace draft persistence', () => {
  it('같은 job의 두 편집본과 같은 필드의 서로 다른 값을 별도 키로 보존한다', () => {
    const a = sessionStore();
    const b = sessionStore();
    saveWorkspaceDraft(localStorage, a, 'draft-a', workspace('job-1', 'A 이름'));
    saveWorkspaceDraft(localStorage, b, 'draft-b', workspace('job-1', 'B 이름'));
    expect(
      listWorkspaceDrafts(localStorage, 'job-1')
        .map(draft => draft.workspace.review.name)
        .sort()
    ).toEqual(['A 이름', 'B 이름']);
    expect(readWorkspaceDraft(localStorage, a, 'job-1')?.review.name).toBe('A 이름');
    expect(readWorkspaceDraft(localStorage, b, 'job-1')?.review.name).toBe('B 이름');
    saveWorkspaceDraft(localStorage, a, 'draft-a', workspace('job-1', 'A 두 번째 이름'));
    expect(readWorkspaceDraft(localStorage, b)?.review.name).toBe('B 이름');
  });

  it('job을 바꿔도 각 job의 선택과 마지막 작업을 구분한다', () => {
    const session = sessionStore();
    saveWorkspaceDraft(localStorage, session, 'same-editor', workspace('job-1', '첫 작업'));
    saveWorkspaceDraft(localStorage, session, 'same-editor', workspace('job-2', '다른 작업'));
    expect(readWorkspaceDraft(localStorage, session)?.review.name).toBe('다른 작업');
    expect(readWorkspaceDraft(localStorage, session, 'job-1')?.review.name).toBe('첫 작업');
    expect(listWorkspaceDrafts(localStorage, 'job-2').map(draft => draft.workspace.jobId)).toEqual(['job-2']);
    expect(readWorkspaceDraft(localStorage, session, 'missing-job')).toBeNull();
    saveWorkspaceDraft(localStorage, session, 'same-editor', workspace(null, '요청 전 입력'));
    expect(readWorkspaceDraft(localStorage, session)?.review.name).toBe('요청 전 입력');
    expect(listWorkspaceDrafts(localStorage, null).map(draft => draft.workspace.jobId)).toEqual([null]);
  });

  it('기존 전역·job별 v1을 읽고 원본은 쓰거나 지우지 않는다', () => {
    const legacy = JSON.stringify(workspace('job-old', '이전 이름'));
    const otherLegacy = JSON.stringify(workspace('job-other', '다른 기존 작업'));
    localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, legacy);
    localStorage.setItem(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-other`, otherLegacy);
    const session = sessionStore();
    expect(readWorkspaceDraft(localStorage, session)?.review.name).toBe('이전 이름');
    expect(readWorkspaceDraft(localStorage, session, 'job-other')?.review.name).toBe('다른 기존 작업');
    saveWorkspaceDraft(localStorage, session, 'fork', workspace('job-old', '새 편집본'));
    localStorage.setItem(RESEARCH_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace('job-old', '오래된 탭의 쓰기')));
    expect(readWorkspaceDraft(localStorage, session, 'job-old')?.review.name).toBe('새 편집본');
    expect(localStorage.getItem(`${RESEARCH_WORKSPACE_STORAGE_KEY}:job-other`)).toBe(otherLegacy);
    expect(listWorkspaceDrafts(localStorage, 'job-old')).toHaveLength(1);
  });

  it('새 탭은 저장된 편집본을 찾고 손상·미지원 버전·다른 job에 놓인 값은 복원하지 않는다', () => {
    saveWorkspaceDraft(localStorage, sessionStore(), 'valid', workspace('job-good', '복구할 이름'));
    const validKey = localStorage.key(0)!;
    const valid = JSON.parse(localStorage.getItem(validKey)!);
    localStorage.setItem(`${validKey}-corrupt`, 'not json');
    localStorage.setItem(`${validKey}-future`, JSON.stringify({ ...valid, version: 3 }));
    localStorage.setItem(validKey.replace('job-good', 'job-wrong'), JSON.stringify(valid));
    localStorage.setItem('unrelated', JSON.stringify(valid));
    expect(listWorkspaceDrafts(localStorage)).toHaveLength(1);
    expect(readWorkspaceDraft(localStorage, sessionStore(), 'job-good')?.review.name).toBe('복구할 이름');
    expect(readWorkspaceDraft(localStorage, sessionStore(), 'job-wrong')).toBeNull();
  });
});
