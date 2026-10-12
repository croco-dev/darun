import {
  PRODUCT_RESEARCH_DRAFT_VERSION,
  RESEARCH_LIMITS,
  hashSourceSnapshot,
  isAnchorExcerptPresent,
  normalizeOfficialUrl,
  productInvalidArgs,
  suggestSlug,
  type CategoryRepository,
  type NormalizedResearchSource,
  type ProductResearchDraftV1,
  type ProductResearchFailureCode,
  type ProductResearchJobEntity,
  type ProductResearchJobRepository,
  type ProductResearchWarning,
} from '@darun/products-domain';
import type { WebSearchResult } from '@darun/utils-llm';
import { isAbortError, withAbortableStage, withRetry } from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { createHash } from 'node:crypto';

export type ProductResearchWebSearch = {
  search(
    query: string,
    count: number,
    signal?: AbortSignal
  ): Promise<
    | { ok: true; results: WebSearchResult[] }
    | { ok: false; code: 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR'; message?: string }
  >;
};

export type ProductResearchLlmClient = {
  getModel(): Promise<string>;
  complete(systemPrompt: string, userPrompt: string, options?: { signal?: AbortSignal }): Promise<string>;
};

export type ProductResearchDependencies = {
  jobRepository: ProductResearchJobRepository;
  categoryRepository?: CategoryRepository;
  searchClient: ProductResearchWebSearch;
  llm: ProductResearchLlmClient;
  promptVersion?: string;
};

export const PRODUCT_RESEARCH_PROMPT_VERSION = 'research-v1';
const MAX_SEARCH_FAILURES_BEFORE_ABORT = 2;
const LEASE_MS = 5 * 60 * 1000;
// Stage wall-clock budget는 worker deadline(5분) 안에 들어오도록 합성
// 1회 호출을 90초로 제한하고, 검색 1회 호출은 15초로 제한한다.
const RESEARCH_STAGE_BUDGET_MS = 90_000;
const SEARCH_STAGE_BUDGET_MS = 15_000;
// LLM stage 재시도는 재시도 가능 클래스(타임아웃/429/5xx)에만 적용한다.
// Abort는 호출자 의도이므로 withRetry가 재시도하지 않는다.
const LLM_STAGE_MAX_RETRIES = 1;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const aborted = new Error('작업이 중단되었습니다.');
    aborted.name = 'AbortError';
    throw aborted;
  }
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function requestKeyFor(officialUrl: string, requestId?: string): string {
  const trimmed = requestId?.trim();
  // Manual re-research creates a new logical job preserving prior results.
  // Absent requestId (legacy callers/tests) falls back to URL-keyed dedup.
  if (trimmed) {
    return `req:${trimmed}`;
  }
  return `url:${sha256Hex(officialUrl)}`;
}

function isRequestId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(value.trim());
}

function isUniqueViolation(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code === '23505') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /duplicate key|unique constraint|UNIQUE constraint/i.test(message);
}

function toFailureCode(code: string): ProductResearchFailureCode {
  if (code === 'NOT_CONFIGURED') {
    return 'SEARCH_NOT_CONFIGURED';
  }
  if (code === 'RATE_LIMITED') {
    return 'SEARCH_RATE_LIMITED';
  }
  return 'SEARCH_UNAVAILABLE';
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseStrictJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```') || trimmed.endsWith('```')) {
    throw new Error('LLM 응답에 코드 블록이 포함되어 있습니다.');
  }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error('LLM 응답이 JSON 객체 형식이 아닙니다.');
  }
  return JSON.parse(trimmed);
}

type DraftPayload = {
  name?: unknown;
  suggestedSlug?: unknown;
  summary?: unknown;
  categoryCandidates?: unknown;
  features?: unknown;
  tags?: unknown;
  companyCandidate?: unknown;
  alternativeCandidates?: unknown;
  warnings?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function buildResearchSystemPrompt(categoryLabel: string): string {
  return `당신은 Darun의 서비스 리서치 에디터입니다. 제공된 웹 검색 근거만으로 초안을 작성합니다.
절대 불변 원칙:
1. 근거에 없는 사실(가격, 사용자 수, 수상, 수치, 출시일)을 추가하거나 추론하지 마십시오.
2. 모든 핵심 진술(name, summary, features)은 해당 출처의 발췌(excerpt)를 anchors에 명시해야 합니다. 발췌는 출처 텍스트에 그대로 존재해야 합니다.
3. 출력은 JSON 객체 하나만 허용됩니다. 코드 블록, 설명 문구를 포함하지 마십시오.
카테고리 목록: ${categoryLabel}`;
}

@Service()
export class ProductResearchService {
  constructor(
    @Inject('ProductResearchJobRepository') private readonly jobRepository?: ProductResearchJobRepository,
    @Inject('CategoryRepository') private readonly categoryRepository?: CategoryRepository
  ) {}

  static buildDraftValidator(input: {
    raw: unknown;
    originalUrl: string;
    sources: NormalizedResearchSource[];
    categories: Array<{ id: string }>;
    model: string;
    promptVersion: string;
  }): ProductResearchDraftV1 {
    const { raw, originalUrl, sources, categories, model, promptVersion } = input;
    const inputHostname = new URL(originalUrl).hostname.toLowerCase();
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error('리서치 결과가 올바른 JSON 객체가 아닙니다.');
    }
    const payload = raw as DraftPayload;
    const sourceById = new Map(sources.map(source => [source.id, source]));
    const validCategoryIds = new Set(categories.map(category => category.id));
    const warnings = new Set<ProductResearchWarning>();
    const pushWarnings = (items: unknown) => {
      if (!Array.isArray(items)) {
        return;
      }
      for (const item of items) {
        if (
          item === 'PARTIAL_SEARCH_FAILURE' ||
          item === 'NO_INPUT_HOST_SOURCES' ||
          item === 'SPARSE_FACTS' ||
          item === 'AMBIGUOUS_PRODUCT'
        ) {
          warnings.add(item);
        }
      }
    };

    const nameValue = asString(payload.name);
    if (!nameValue || nameValue.length > 100) {
      throw new Error('리서치 결과의 name이 유효하지 않습니다.');
    }
    const nameAnchors = ProductResearchService.validateAnchors(
      (payload as { nameAnchors?: unknown }).nameAnchors,
      sourceById,
      'nameAnchors'
    );
    if (nameAnchors.length === 0) {
      throw new Error('name에는 최소 1개의 근거가 필요합니다.');
    }
    const nameEvidence = ProductResearchService.evidenceOf(nameAnchors, sourceById, inputHostname);

    const summaryValue = asString(payload.summary);
    const summaryAnchors =
      summaryValue === null
        ? []
        : ProductResearchService.validateAnchors(
            (payload as { summaryAnchors?: unknown }).summaryAnchors,
            sourceById,
            'summaryAnchors'
          );
    if (summaryValue !== null) {
      if (summaryValue.length > RESEARCH_LIMITS.maxOutputSummaryChars) {
        throw new Error('summary가 제한을 초과했습니다.');
      }
      if (summaryAnchors.length === 0) {
        throw new Error('summary에는 최소 1개의 근거가 필요합니다.');
      }
    }
    const summaryEvidence =
      summaryValue === null ? 'NONE' : ProductResearchService.evidenceOf(summaryAnchors, sourceById, inputHostname);

    const categoryCandidates: ProductResearchDraftV1['categoryCandidates'] = [];
    if (Array.isArray(payload.categoryCandidates)) {
      for (const [index, item] of payload.categoryCandidates.entries()) {
        if (typeof item !== 'object' || item === null) {
          throw new Error(`categoryCandidates[${index}]가 유효하지 않습니다.`);
        }
        const candidate = item as { categoryId?: unknown; reason?: unknown };
        if (typeof candidate.categoryId !== 'string' || !validCategoryIds.has(candidate.categoryId)) {
          throw new Error(`categoryCandidates[${index}].categoryId가 유효하지 않습니다.`);
        }
        const reason = asString(candidate.reason);
        if (!reason || reason.length > 200) {
          throw new Error(`categoryCandidates[${index}].reason이 유효하지 않습니다.`);
        }
        categoryCandidates.push({ categoryId: candidate.categoryId, reason });
        if (categoryCandidates.length >= 3) {
          break;
        }
      }
    }

    const features: ProductResearchDraftV1['features'] = [];
    if (!Array.isArray(payload.features)) {
      throw new Error('features는 배열이어야 합니다.');
    }
    for (const [index, item] of payload.features.entries()) {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`features[${index}]가 유효하지 않습니다.`);
      }
      const feature = item as { name?: unknown; summary?: unknown; emoji?: unknown; anchors?: unknown };
      const featureName = asString(feature.name);
      const featureSummary = asString(feature.summary);
      const emoji = asString(feature.emoji);
      if (!featureName || featureName.length > 80 || !featureSummary || featureSummary.length > 300) {
        throw new Error(`features[${index}]의 이름/요약이 유효하지 않습니다.`);
      }
      const anchors = ProductResearchService.validateAnchors(feature.anchors, sourceById, `features[${index}].anchors`);
      if (anchors.length === 0) {
        throw new Error(`features[${index}]에는 최소 1개의 근거가 필요합니다.`);
      }
      features.push({
        name: featureName,
        summary: featureSummary,
        emoji: emoji ?? '✨',
        anchors,
        evidenceType: ProductResearchService.evidenceOf(anchors, sourceById, inputHostname),
      });
      if (features.length >= RESEARCH_LIMITS.maxFeatures) {
        break;
      }
    }

    const tags: string[] = [];
    if (Array.isArray(payload.tags)) {
      const seen = new Set<string>();
      for (const item of payload.tags) {
        if (typeof item !== 'string') {
          continue;
        }
        const normalized = item.trim().replace(/\s+/g, ' ');
        if (normalized.length < 1 || normalized.length > 30 || seen.has(normalized.toLowerCase())) {
          continue;
        }
        seen.add(normalized.toLowerCase());
        tags.push(normalized);
        if (tags.length >= RESEARCH_LIMITS.maxTags) {
          break;
        }
      }
    }

    const companyCandidate = ProductResearchService.validateCompany(
      payload.companyCandidate,
      sourceById,
      'companyCandidate'
    );
    const alternativeCandidates: ProductResearchDraftV1['alternativeCandidates'] = [];
    if (Array.isArray(payload.alternativeCandidates)) {
      for (const [index, item] of payload.alternativeCandidates.entries()) {
        const parsed = ProductResearchService.validateCompany(item, sourceById, `alternativeCandidates[${index}]`);
        if (parsed) {
          alternativeCandidates.push(parsed);
        }
        if (alternativeCandidates.length >= RESEARCH_LIMITS.maxAlternatives) {
          break;
        }
      }
    }

    pushWarnings(payload.warnings);
    if (!sources.some(source => source.relationToInput === 'INPUT_HOST_MATCH')) {
      warnings.add('NO_INPUT_HOST_SOURCES');
    }
    if (sources.length < 3 || features.length === 0) {
      warnings.add('SPARSE_FACTS');
    }

    const suggestedRaw = asString(payload.suggestedSlug) ?? '';
    const suggestedSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suggestedRaw)
      ? suggestedRaw
      : suggestSlug(nameValue, new URL(originalUrl).hostname);

    return {
      version: PRODUCT_RESEARCH_DRAFT_VERSION,
      originalUrl,
      identity: {
        name: { value: nameValue, anchors: nameAnchors, evidenceType: nameEvidence },
        suggestedSlug,
      },
      summary:
        summaryValue === null ? null : { value: summaryValue, anchors: summaryAnchors, evidenceType: summaryEvidence },
      categoryCandidates,
      features,
      tags,
      companyCandidate,
      alternativeCandidates,
      sources,
      warnings: [...warnings],
      sourceSnapshotHash: hashSourceSnapshot(sources),
      promptVersion,
      model,
    };
  }

  private static validateAnchors(
    raw: unknown,
    sourceById: Map<string, NormalizedResearchSource>,
    fieldName: string
  ): ProductResearchDraftV1['identity']['name']['anchors'] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error(`${fieldName}에는 최소 1개의 근거가 필요합니다.`);
    }
    const anchors: Array<{ sourceId: string; excerpt: string }> = [];
    const seen = new Set<string>();
    for (const item of raw.slice(0, 5)) {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`${fieldName}의 근거 형식이 유효하지 않습니다.`);
      }
      const anchor = item as { sourceId?: unknown; excerpt?: unknown };
      if (typeof anchor.sourceId !== 'string' || typeof anchor.excerpt !== 'string') {
        throw new Error(`${fieldName}의 근거 형식이 유효하지 않습니다.`);
      }
      const source = sourceById.get(anchor.sourceId);
      const excerpt = normalizeWhitespace(anchor.excerpt);
      if (!source || excerpt.length === 0 || excerpt.length > 300) {
        throw new Error(`${fieldName}의 근거가 유효하지 않습니다.`);
      }
      if (!isAnchorExcerptPresent(excerpt, source)) {
        throw new Error(`${fieldName}의 발췌가 출처에 존재하지 않습니다.`);
      }
      const key = `${anchor.sourceId}::${excerpt}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      anchors.push({ sourceId: anchor.sourceId, excerpt });
    }
    if (anchors.length === 0) {
      throw new Error(`${fieldName}에는 최소 1개의 근거가 필요합니다.`);
    }
    return anchors;
  }

  private static evidenceOf(
    anchors: Array<{ sourceId: string }>,
    sourceById: Map<string, NormalizedResearchSource>,
    inputHostname: string
  ): ProductResearchDraftV1['identity']['name']['evidenceType'] {
    const cited = anchors
      .map(anchor => sourceById.get(anchor.sourceId))
      .filter((source): source is NormalizedResearchSource => source !== undefined);
    // verified-official(INPUT_HOST)은 입력 호스트와 정확히 같은 호스트에서만 인정한다.
    // 같은 호스트의 서로 다른 정체성(서브도메인 변형 등)은 서로 독립된 근거가 아니다.
    if (cited.some(source => source.hostname.toLowerCase() === inputHostname.toLowerCase())) {
      return 'INPUT_HOST';
    }
    const externalHostnames = new Set(
      cited.filter(source => source.relationToInput === 'EXTERNAL').map(source => source.hostname)
    );
    if (externalHostnames.size >= 2) {
      return 'MULTIPLE_EXTERNAL';
    }
    if (externalHostnames.size === 1) {
      return 'SINGLE_EXTERNAL';
    }
    return 'NONE';
  }

  private static validateCompany(
    raw: unknown,
    sourceById: Map<string, NormalizedResearchSource>,
    fieldName: string
  ): ProductResearchDraftV1['companyCandidate'] {
    if (raw === null || raw === undefined) {
      return null;
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`${fieldName}이 유효하지 않습니다.`);
    }
    const candidate = raw as { name?: unknown; website?: unknown; anchors?: unknown };
    const name = asString(candidate.name);
    if (!name || name.length > 100) {
      throw new Error(`${fieldName}.name이 유효하지 않습니다.`);
    }
    const website = asString(candidate.website);
    if (website !== null) {
      try {
        const parsed = new URL(website);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('invalid');
        }
      } catch {
        throw new Error(`${fieldName}.website가 유효하지 않습니다.`);
      }
    }
    const anchors = ProductResearchService.validateAnchors(candidate.anchors, sourceById, `${fieldName}.anchors`);
    return { name, website: website ?? undefined, anchors };
  }

  async requestResearch(
    officialUrlInput: string,
    deps: ProductResearchDependencies,
    requestId?: string
  ): Promise<{ job: ProductResearchJobEntity; queued: boolean }> {
    const normalized = normalizeOfficialUrl(officialUrlInput);
    if (!normalized.ok) {
      throw productInvalidArgs(normalized.reason);
    }
    if (requestId !== undefined && !isRequestId(requestId)) {
      throw productInvalidArgs('요청 ID 형식이 유효하지 않습니다.');
    }
    const requestKey = requestKeyFor(normalized.url, requestId);
    const existing = await deps.jobRepository.findByRequestKey(requestKey);
    if (existing) {
      if (existing.officialUrl !== normalized.url) {
        throw productInvalidArgs('요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.');
      }
      return { job: existing, queued: false };
    }
    try {
      const job = await deps.jobRepository.createPendingJob({
        requestKey,
        officialUrl: normalized.url,
      });
      return { job, queued: true };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await deps.jobRepository.findByRequestKey(requestKey);
      if (!raced) {
        throw error;
      }
      if (raced.officialUrl !== normalized.url) {
        throw productInvalidArgs('요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.');
      }
      return { job: raced, queued: false };
    }
  }

  async retryFailedResearch(
    jobId: string,
    deps: ProductResearchDependencies,
    requestId?: string
  ): Promise<{ job: ProductResearchJobEntity; deduped: boolean }> {
    const target = requestId?.trim() ? requestId : crypto.randomUUID();
    if (!isRequestId(target)) {
      throw productInvalidArgs('요청 ID 형식이 유효하지 않습니다.');
    }
    const original = await deps.jobRepository.findById(jobId);
    if (!original) {
      throw productInvalidArgs(`존재하지 않는 조사 작업입니다: ${jobId}`);
    }
    if (original.status !== 'failed') {
      return { job: original, deduped: true };
    }
    const requestKey = requestKeyFor(original.officialUrl, target);
    try {
      const created = await deps.jobRepository.createPendingJob({
        requestKey,
        officialUrl: original.officialUrl,
      });
      return { job: created, deduped: false };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await deps.jobRepository.findByRequestKey(requestKey);
      if (!raced) {
        throw error;
      }
      if (raced.officialUrl !== original.officialUrl) {
        throw productInvalidArgs('요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.');
      }
      return { job: raced, deduped: true };
    }
  }

  async executeResearch(
    jobId: string,
    deps: ProductResearchDependencies,
    leaseToken = crypto.randomUUID(),
    options?: { signal?: AbortSignal; stageBudgetMs?: number }
  ): Promise<ProductResearchJobEntity | null> {
    const claim = await deps.jobRepository.claimJob({
      jobId,
      leaseToken,
      leaseUntil: new Date(Date.now() + LEASE_MS),
    });
    if (!claim.claimed || !claim.job) {
      return claim.job;
    }
    const job = claim.job;
    const stageBudgetMs = options?.stageBudgetMs ?? RESEARCH_STAGE_BUDGET_MS;
    try {
      const normalized = normalizeOfficialUrl(job.officialUrl);
      if (!normalized.ok) {
        return deps.jobRepository.failJob({
          jobId,
          leaseToken,
          errorCode: 'INVALID_URL',
          errorMessage: normalized.reason,
        });
      }
      const queries = ProductResearchService.buildQueries(normalized.hostname, normalized.url);
      const collected: Array<{ title: string; url: string; description: string; extraSnippets?: string[] }> = [];
      let failures = 0;
      for (const query of queries) {
        throwIfAborted(options?.signal);
        let outcome: Awaited<ReturnType<ProductResearchWebSearch['search']>>;
        try {
          outcome = await withAbortableStage(signal => deps.searchClient.search(query, 5, signal), {
            budgetMs: SEARCH_STAGE_BUDGET_MS,
            signal: options?.signal,
            message: '웹 검색 요청이 시간 초과되었습니다.',
          });
        } catch (error) {
          // 호출자 abort는 terminal 확정 없이 in_progress lease 만료·recovery에 맡긴다.
          if (isAbortError(error) || options?.signal?.aborted) {
            console.warn(`[ProductResearchService] Job ${jobId} aborted during search; leaving lease to expire.`);
            return job;
          }
          // Stage budget 만료(RetryableError)는 단일 공급자 stall일 뿐이므로
          // per-query 실패로 흡수한다. 2회 연속 실패 정책과 부분 성공 지원이 그대로 적용된다.
          failures += 1;
          if (failures >= MAX_SEARCH_FAILURES_BEFORE_ABORT) {
            return deps.jobRepository.failJob({
              jobId,
              leaseToken,
              errorCode: 'SEARCH_UNAVAILABLE',
              errorMessage: error instanceof Error ? error.message : '웹 검색에 실패했습니다.',
            });
          }
          continue;
        }
        if (!outcome.ok) {
          failures += 1;
          // 호출자 abort 도중의 검색 실패(TIMEOUT 등)는 실패 카운트·terminal
          // 확정 없이 in_progress lease를 만료·recovery에 맡긴다. 일반
          // 타임아웃·상류 실패는 기존처럼 실패 카운트로 흡수된다.
          if (options?.signal?.aborted) {
            console.warn(`[ProductResearchService] Job ${jobId} aborted during search; leaving lease to expire.`);
            return job;
          }
          if (outcome.code === 'NOT_CONFIGURED') {
            return deps.jobRepository.failJob({
              jobId,
              leaseToken,
              errorCode: 'SEARCH_NOT_CONFIGURED',
              errorMessage: outcome.message ?? 'Brave 검색 키가 설정되지 않았습니다.',
            });
          }
          if (failures >= MAX_SEARCH_FAILURES_BEFORE_ABORT) {
            return deps.jobRepository.failJob({
              jobId,
              leaseToken,
              errorCode: toFailureCode(outcome.code),
              errorMessage: outcome.message ?? '웹 검색에 실패했습니다.',
            });
          }
          continue;
        }
        collected.push(...outcome.results);
      }

      const { normalizeResearchSources } = await import('@darun/products-domain');
      const sources = normalizeResearchSources(
        collected.map(result => ({
          title: result.title,
          url: result.url,
          description: result.description,
          extraSnippets: result.extraSnippets ?? [],
        })),
        normalized.hostname
      );
      if (sources.length === 0) {
        return deps.jobRepository.failJob({
          jobId,
          leaseToken,
          errorCode: 'NO_USABLE_SOURCES',
          errorMessage: '사용 가능한 검색 근거를 찾지 못했습니다.',
        });
      }

      const categories = deps.categoryRepository ? await deps.categoryRepository.findAll() : [];
      const categoryLabel =
        categories.length > 0 ? categories.map(category => `${category.id}:${category.labelKo}`).join(', ') : 'none';
      const systemPrompt = buildResearchSystemPrompt(categoryLabel);
      const userPrompt = JSON.stringify(
        {
          originalUrl: normalized.url,
          inputHostname: normalized.hostname,
          sources: sources.map(source => ({
            id: source.id,
            title: truncate(source.title, 300),
            url: source.url,
            hostname: source.hostname,
            snippet: truncate(source.snippet, 700),
            extraSnippets: source.extraSnippets.slice(0, 3),
            relationToInput: source.relationToInput,
          })),
        },
        null,
        2
      );
      let rawResponse: string;
      try {
        throwIfAborted(options?.signal);
        rawResponse = await withRetry(
          () =>
            withAbortableStage(
              signal =>
                deps.llm.complete(systemPrompt, `${userPrompt}\n반드시 JSON 객체 하나만 출력하십시오.`, { signal }),
              {
                budgetMs: stageBudgetMs,
                signal: options?.signal,
                message: 'LLM 합성 요청이 시간 초과되었습니다.',
              }
            ),
          { maxRetries: LLM_STAGE_MAX_RETRIES, baseDelay: 1000, maxDelay: 5000 }
        );
      } catch (error) {
        // 호출자 abort는 terminal failJob 없이 lease 만료·recovery에 맡긴다.
        if (isAbortError(error) || options?.signal?.aborted) {
          console.warn(`[ProductResearchService] Job ${jobId} aborted during LLM stage; leaving lease to expire.`);
          return job;
        }
        return deps.jobRepository.failJob({
          jobId,
          leaseToken,
          errorCode: 'LLM_UNAVAILABLE',
          errorMessage: error instanceof Error ? error.message : 'LLM 호출에 실패했습니다.',
        });
      }
      let parsed: unknown;
      try {
        parsed = parseStrictJsonObject(rawResponse);
      } catch (error) {
        return deps.jobRepository.failJob({
          jobId,
          leaseToken,
          errorCode: 'INVALID_GENERATION',
          errorMessage: error instanceof Error ? error.message : 'LLM 응답 형식이 유효하지 않습니다.',
        });
      }
      const model = await deps.llm.getModel();
      let draft: ProductResearchDraftV1;
      try {
        draft = ProductResearchService.buildDraftValidator({
          raw: parsed,
          originalUrl: normalized.url,
          sources,
          categories: categories.map(category => ({ id: category.id })),
          model,
          promptVersion: deps.promptVersion ?? PRODUCT_RESEARCH_PROMPT_VERSION,
        });
      } catch (error) {
        return deps.jobRepository.failJob({
          jobId,
          leaseToken,
          errorCode: 'INVALID_GENERATION',
          errorMessage: error instanceof Error ? error.message : '리서치 결과 검증에 실패했습니다.',
        });
      }
      if (failures > 0 && !draft.warnings.includes('PARTIAL_SEARCH_FAILURE')) {
        draft = { ...draft, warnings: [...draft.warnings, 'PARTIAL_SEARCH_FAILURE'] };
      }
      return deps.jobRepository.completeJob({
        jobId,
        leaseToken,
        result: draft,
        sourceSnapshotHash: draft.sourceSnapshotHash,
        promptVersion: draft.promptVersion,
        model: draft.model,
      });
    } catch (error) {
      // 호출자 abort(AbortError·이미 중단된 부모 signal)는 terminal failJob으로
      // 확정하지 않는다. in_progress lease가 만료되면 recovery가 재시도한다.
      // description·translation worker와 동일한 규율이다.
      if (isAbortError(error) || options?.signal?.aborted) {
        console.warn(`[ProductResearchService] Job ${jobId} aborted; leaving lease to expire.`);
        return job;
      }
      return deps.jobRepository.failJob({
        jobId,
        leaseToken,
        errorCode: 'RETRY_EXHAUSTED',
        errorMessage: error instanceof Error ? error.message : '리서치 실행 중 오류가 발생했습니다.',
      });
    }
  }

  static buildQueries(hostname: string, officialUrl: string): string[] {
    const host = hostname.replace(/^www\./, '');
    return [
      `${host} 공식 사이트`,
      `site:${host} ${host}`,
      `${officialUrl} 서비스 소개 기능`,
      `${host} pricing features`,
      `${host} 회사 소개`,
    ].slice(0, 5);
  }
}
