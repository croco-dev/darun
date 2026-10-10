export type ProductResearchJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ProductResearchStage = 'searching' | 'synthesizing';

export type ProductResearchFailureCode =
  | 'INVALID_URL'
  | 'SEARCH_NOT_CONFIGURED'
  | 'SEARCH_RATE_LIMITED'
  | 'SEARCH_UNAVAILABLE'
  | 'NO_USABLE_SOURCES'
  | 'LLM_UNAVAILABLE'
  | 'INVALID_GENERATION'
  | 'RETRY_EXHAUSTED';

export type ProductResearchWarning =
  | 'PARTIAL_SEARCH_FAILURE'
  | 'NO_INPUT_HOST_SOURCES'
  | 'SPARSE_FACTS'
  | 'AMBIGUOUS_PRODUCT';

export type ResearchRelationToInput = 'INPUT_HOST_MATCH' | 'EXTERNAL';

export type ResearchEvidenceType = 'INPUT_HOST' | 'MULTIPLE_EXTERNAL' | 'SINGLE_EXTERNAL' | 'NONE';

export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  hostname: string;
  snippet: string;
  extraSnippets: string[];
  relationToInput: ResearchRelationToInput;
};

export type ResearchAnchor = {
  sourceId: string;
  excerpt: string;
};

export type ResearchText = {
  value: string;
  anchors: ResearchAnchor[];
  evidenceType: ResearchEvidenceType;
};

export type ProductResearchDraftV1 = {
  version: 1;
  originalUrl: string;
  identity: {
    name: ResearchText;
    suggestedSlug: string;
  };
  summary: ResearchText | null;
  categoryCandidates: Array<{
    categoryId: string;
    reason: string;
  }>;
  features: Array<{
    name: string;
    summary: string;
    emoji: string;
    anchors: ResearchAnchor[];
    evidenceType: ResearchEvidenceType;
  }>;
  tags: string[];
  companyCandidate: { name: string; website?: string; anchors: ResearchAnchor[] } | null;
  alternativeCandidates: Array<{ name: string; website?: string; anchors: ResearchAnchor[] }>;
  sources: ResearchSource[];
  warnings: ProductResearchWarning[];
  sourceSnapshotHash: string;
  promptVersion: string;
  model: string;
};

export type ProductResearchJobEntity = {
  id: string;
  requestKey: string;
  officialUrl: string;
  status: ProductResearchJobStatus;
  stage: ProductResearchStage | null;
  errorCode: ProductResearchFailureCode | null;
  errorMessage: string | null;
  result: ProductResearchDraftV1 | null;
  sourceSnapshotHash: string | null;
  promptVersion: string | null;
  model: string | null;
  leaseToken: string | null;
  leaseUntil: Date | null;
  attemptCount: number;
  materializedProductId: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const PRODUCT_RESEARCH_DRAFT_VERSION = 1 as const;
