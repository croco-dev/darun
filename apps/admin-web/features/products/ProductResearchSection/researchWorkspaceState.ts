export type ResearchWorkspaceFeatureDraft = {
  name: string;
  summary: string;
  emoji: string;
};

export type ResearchWorkspaceReviewDraft = {
  name: string;
  slug: string;
  summary: string;
  logoUrl: string;
  officialUrl: string;
  categoryIds: string[];
  features: ResearchWorkspaceFeatureDraft[];
  tags: string[];
};

export type ResearchWorkspacePersistedState = {
  version: 1;
  requestId: string;
  officialUrl: string;
  jobId: string | null;
  review: ResearchWorkspaceReviewDraft;
  logoFileName: string | null;
  uploadedLogoUrl: string | null;
  materializedSlug: string | null;
};

export const RESEARCH_WORKSPACE_STORAGE_KEY = 'darun:admin:product-research-workspace:v1';
export const RESEARCH_WORKSPACE_DEFAULT_REVIEW: ResearchWorkspaceReviewDraft = {
  name: '',
  slug: '',
  summary: '',
  logoUrl: '',
  officialUrl: '',
  categoryIds: [],
  features: [],
  tags: [],
};

type ReviewPrefillSource = {
  name?: { value?: string | null } | null;
  suggestedSlug?: string | null;
  summary?: { value?: string | null } | null;
  features?: Array<{ name?: string | null; summary?: string | null; emoji?: string | null }> | null;
  tags?: string[] | null;
};

export function createInitialWorkspaceReview(officialUrl = ''): ResearchWorkspaceReviewDraft {
  return { ...RESEARCH_WORKSPACE_DEFAULT_REVIEW, officialUrl, features: [], tags: [], categoryIds: [] };
}

export function createInitialWorkspaceState(requestId: string): ResearchWorkspacePersistedState {
  return {
    version: 1,
    requestId,
    officialUrl: '',
    jobId: null,
    review: createInitialWorkspaceReview(),
    logoFileName: null,
    uploadedLogoUrl: null,
    materializedSlug: null,
  };
}

export function prefillReviewFromResult(
  previous: ResearchWorkspaceReviewDraft,
  result: ReviewPrefillSource,
  officialUrl: string
): ResearchWorkspaceReviewDraft {
  const name = previous.name.trim() ? previous.name : (result.name?.value ?? '');
  const slug = previous.slug.trim() ? previous.slug : (result.suggestedSlug ?? '');
  const summary = previous.summary.trim() ? previous.summary : (result.summary?.value ?? '');
  const features =
    previous.features.length > 0
      ? previous.features
      : ((result.features ?? []).map(feature => ({
          name: feature.name ?? '',
          summary: feature.summary ?? '',
          emoji: feature.emoji ?? '✨',
        })) as ResearchWorkspaceFeatureDraft[]);
  const tags = previous.tags.length > 0 ? previous.tags : [...(result.tags ?? [])];
  return {
    ...previous,
    name,
    slug,
    summary,
    officialUrl: previous.officialUrl.trim() ? previous.officialUrl : officialUrl,
    features,
    tags,
  };
}

function isReviewDraft(value: unknown): value is ResearchWorkspaceReviewDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.summary === 'string' &&
    typeof candidate.logoUrl === 'string' &&
    typeof candidate.officialUrl === 'string' &&
    Array.isArray(candidate.categoryIds) &&
    Array.isArray(candidate.features) &&
    Array.isArray(candidate.tags)
  );
}

export function parseWorkspaceState(raw: string | null): ResearchWorkspacePersistedState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ResearchWorkspacePersistedState>;
    if (parsed.version !== 1 || typeof parsed.requestId !== 'string' || !parsed.requestId.trim()) {
      return null;
    }
    if (!isReviewDraft(parsed.review)) {
      return null;
    }
    return {
      version: 1,
      requestId: parsed.requestId,
      officialUrl: typeof parsed.officialUrl === 'string' ? parsed.officialUrl : '',
      jobId: typeof parsed.jobId === 'string' ? parsed.jobId : null,
      review: {
        name: parsed.review.name,
        slug: parsed.review.slug,
        summary: parsed.review.summary,
        logoUrl: parsed.review.logoUrl,
        officialUrl: parsed.review.officialUrl,
        categoryIds: parsed.review.categoryIds.filter((id): id is string => typeof id === 'string'),
        features: parsed.review.features.filter(
          (feature): feature is ResearchWorkspaceFeatureDraft =>
            typeof feature === 'object' &&
            feature !== null &&
            typeof (feature as ResearchWorkspaceFeatureDraft).name === 'string' &&
            typeof (feature as ResearchWorkspaceFeatureDraft).summary === 'string'
        ),
        tags: parsed.review.tags.filter((tag): tag is string => typeof tag === 'string'),
      },
      logoFileName: typeof parsed.logoFileName === 'string' ? parsed.logoFileName : null,
      uploadedLogoUrl:
        typeof parsed.uploadedLogoUrl === 'string' && parsed.uploadedLogoUrl.trim()
          ? parsed.uploadedLogoUrl
          : typeof parsed.review.logoUrl === 'string' && parsed.review.logoUrl.startsWith('https://res.cloudinary.com/')
            ? parsed.review.logoUrl
            : null,
      materializedSlug: typeof parsed.materializedSlug === 'string' ? parsed.materializedSlug : null,
    };
  } catch {
    return null;
  }
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function parseTagsInput(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of value.split(',')) {
    const normalized = part.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(normalized);
  }
  return tags;
}

export type WorkspaceImageSelection = { kind: 'file'; file: File; fileName: string } | { kind: 'url'; logoUrl: string };

export function resolveLogoUrlForMaterialize(
  selection: WorkspaceImageSelection | null,
  uploadedLogoUrl: string | null
): string | null {
  if (selection?.kind === 'url') {
    return selection.logoUrl.trim() || null;
  }
  if (selection?.kind === 'file') {
    return uploadedLogoUrl?.trim() || null;
  }
  return null;
}

export function shouldStopResearchPolling(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'failed';
}
