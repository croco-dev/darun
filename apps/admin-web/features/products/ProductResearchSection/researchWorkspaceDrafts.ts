import {
  RESEARCH_WORKSPACE_STORAGE_KEY,
  parseWorkspaceState,
  type ResearchWorkspacePersistedState,
} from './researchWorkspaceState';

const DRAFT_PREFIX = 'darun:admin:product-research-drafts:v2:';
const ACTIVE_PREFIX = `${DRAFT_PREFIX}active:`;
const LAST_ACTIVE_KEY = `${DRAFT_PREFIX}last-active`;

export interface ResearchWorkspaceDraft {
  version: 2;
  id: string;
  updatedAt: string;
  workspace: ResearchWorkspacePersistedState;
}

function scope(jobId: string | null): string {
  return jobId === null ? 'new' : `job:${encodeURIComponent(jobId)}`;
}

function draftKey(jobId: string | null, id: string): string {
  return `${DRAFT_PREFIX}${scope(jobId)}:${id}`;
}

export function listWorkspaceDrafts(storage: Storage, jobId?: string | null): ResearchWorkspaceDraft[] {
  const drafts: ResearchWorkspaceDraft[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    try {
      const value = JSON.parse(storage.getItem(key) ?? 'null') as Partial<ResearchWorkspaceDraft> | null;
      if (
        value?.version !== 2 ||
        typeof value.id !== 'string' ||
        !value.id ||
        typeof value.updatedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.updatedAt))
      ) {
        continue;
      }
      const workspace = parseWorkspaceState(JSON.stringify(value.workspace));
      if (!workspace || key !== draftKey(workspace.jobId, value.id)) continue;
      if (jobId !== undefined && workspace.jobId !== jobId) continue;
      drafts.push({
        version: 2,
        id: value.id,
        updatedAt: value.updatedAt,
        workspace,
      });
    } catch {
      // 다른 저장값이나 손상된 편집본을 현재 입력으로 복원하지 않는다.
    }
  }
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

export function readWorkspaceDraft(
  storage: Storage,
  session: Storage,
  targetJobId?: string | null
): ResearchWorkspacePersistedState | null {
  const drafts = listWorkspaceDrafts(storage, targetJobId ?? undefined);
  const activeKey = targetJobId ? `${ACTIVE_PREFIX}${scope(targetJobId)}` : LAST_ACTIVE_KEY;
  const activeId = session.getItem(activeKey);
  const active = drafts.find(draft =>
    targetJobId ? draft.id === activeId : draftKey(draft.workspace.jobId, draft.id) === activeId
  );
  if (active) return active.workspace;

  // v1은 읽기만 한다. 이전 탭이 같은 키를 계속 써도 새 편집본은 영향을 받지 않는다.
  const latest = parseWorkspaceState(storage.getItem(RESEARCH_WORKSPACE_STORAGE_KEY));
  const legacy =
    !targetJobId || latest?.jobId === targetJobId
      ? latest
      : parseWorkspaceState(storage.getItem(`${RESEARCH_WORKSPACE_STORAGE_KEY}:${targetJobId}`));
  return drafts[0]?.workspace ?? legacy;
}

export function saveWorkspaceDraft(
  storage: Storage,
  session: Storage,
  id: string,
  workspace: ResearchWorkspacePersistedState
): void {
  const draft: ResearchWorkspaceDraft = {
    version: 2,
    id,
    updatedAt: new Date().toISOString(),
    workspace,
  };
  storage.setItem(draftKey(workspace.jobId, id), JSON.stringify(draft));
  session.setItem(`${ACTIVE_PREFIX}${scope(workspace.jobId)}`, id);
  session.setItem(LAST_ACTIVE_KEY, draftKey(workspace.jobId, id));
}
