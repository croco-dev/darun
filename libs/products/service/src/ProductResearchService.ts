import {
  CategoryRepositoryToken,
  PRODUCT_RESEARCH_DRAFT_VERSION,
  ProductResearchJobRepositoryToken,
  RESEARCH_LIMITS,
  hashSourceSnapshot,
  isAnchorExcerptPresent,
  normalizeOfficialUrl,
  productIdempotencyKeyConflict,
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
import type { ProductResearchDispatchStatus } from '@darun/products-domain';
import type { WebSearchResult } from '@darun/utils-llm';
import {
  JOB_MAX_ATTEMPTS,
  JOB_LEASE_MS,
  JOB_COMMIT_MARGIN_MS,
  isAbortError,
  withAbortableStage,
  withRetry,
} from '@darun/utils-llm';
import { Inject, Service } from 'typedi';
import { randomUUID } from 'node:crypto';

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
  supportsStructuredOutput?(): Promise<boolean>;
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
export const PRODUCT_RESEARCH_MAX_ATTEMPTS = JOB_MAX_ATTEMPTS;
const LEASE_MS = JOB_LEASE_MS;
const RESEARCH_STAGE_BUDGET_MS = 90_000;
const SEARCH_STAGE_BUDGET_MS = 15_000;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const aborted = new Error('작업이 중단되었습니다.');
    aborted.name = 'AbortError';
    throw aborted;
  }
}

const researchAnchorSchema = {
  type: 'object',
  properties: {
    sourceId: { type: 'string', description: '제공된 sources 배열의 id 중 하나입니다.' },
    excerpt: {
      type: 'string',
      maxLength: 300,
      description: '해당 출처 title/snippet/extraSnippets에 그대로 존재하는 발췌입니다.',
    },
  },
  required: ['sourceId', 'excerpt'],
  additionalProperties: false,
} as const;

export function createProductResearchResponseFormat() {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'product_research_draft',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100 },
          nameAnchors: { type: 'array', items: researchAnchorSchema, minItems: 1, maxItems: 5 },
          summary: { type: ['string', 'null'], maxLength: 255 },
          summaryAnchors: { type: 'array', items: researchAnchorSchema, maxItems: 5 },
          categoryCandidates: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                categoryId: { type: 'string' },
                reason: { type: 'string', maxLength: 200 },
              },
              required: ['categoryId', 'reason'],
              additionalProperties: false,
            },
          },
          features: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 80 },
                summary: { type: 'string', maxLength: 300 },
                emoji: { type: ['string', 'null'], maxLength: 30 },
                anchors: { type: 'array', items: researchAnchorSchema, minItems: 1, maxItems: 5 },
              },
              required: ['name', 'summary', 'emoji', 'anchors'],
              additionalProperties: false,
            },
          },
          tags: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 30 } },
          companyCandidate: {
            type: ['object', 'null'],
            description: '회사 후보가 없으면 null입니다.',
            properties: {
              name: { type: 'string', maxLength: 100 },
              website: { type: ['string', 'null'] },
              anchors: { type: 'array', items: researchAnchorSchema, minItems: 1, maxItems: 5 },
            },
            required: ['name', 'website', 'anchors'],
            additionalProperties: false,
          },
          alternativeCandidates: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 100 },
                website: { type: ['string', 'null'] },
                anchors: { type: 'array', items: researchAnchorSchema, minItems: 1, maxItems: 5 },
              },
              required: ['name', 'website', 'anchors'],
              additionalProperties: false,
            },
          },
          suggestedSlug: { type: 'string', maxLength: 100 },
          warnings: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['PARTIAL_SEARCH_FAILURE', 'NO_INPUT_HOST_SOURCES', 'SPARSE_FACTS', 'AMBIGUOUS_PRODUCT'],
            },
          },
        },
        required: [
          'name',
          'nameAnchors',
          'summary',
          'summaryAnchors',
          'categoryCandidates',
          'features',
          'tags',
          'companyCandidate',
          'alternativeCandidates',
          'suggestedSlug',
          'warnings',
        ],
        additionalProperties: false,
      },
    },
  };
}

export type ProductResearchDispatch = ProductResearchDispatchStatus;

export type RequestProductResearchInput = {
  requestId: string;
  officialUrl: string;
};

function isRequestId(value: string): boolean {
  return /^(?:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|[a-f0-9]{12}4[a-f0-9]{3}[89ab][a-f0-9]{15})$/i.test(
    value.trim()
  );
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    if ('code' in current && current.code === '23505') return true;
    if (!('cause' in current)) return false;
    current = current.cause;
  }
  return false;
}

function isStructuredOutputUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /structured completion was refused|structured completion did not finish|구조화 응답/i.test(message);
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
출력 필드: name, nameAnchors[{sourceId,excerpt}], summary, summaryAnchors[{sourceId,excerpt}], categoryCandidates[{categoryId,reason}], features[{name,summary,emoji,anchors:[{sourceId,excerpt}]}], tags, companyCandidate{name,website,anchors}, alternativeCandidates[{name,website,anchors}], suggestedSlug, warnings.
근거가 부족하면 summary와 companyCandidate는 null, summaryAnchors와 나머지 후보 배열은 []로 두십시오. nameAnchors는 반드시 필요하며 각 feature 및 회사/대안 후보에도 anchors가 필요합니다.
절대 불변 원칙:
1. 근거에 없는 사실(가격, 사용자 수, 수상, 수치, 출시일)을 추가하거나 추론하지 마십시오.
2. 모든 핵심 진술(name, summary, features)은 해당 출처의 발췌(excerpt)를 anchors에 명시해야 합니다. 발췌는 출처 텍스트에 그대로 존재해야 합니다.
3. hostname 일치는 검색 힌트일 뿐 공식 인증이나 서로 독립된 검증이 아닙니다. 같은 호스트의 다른 제품 경로를 동일 제품으로 단정하지 마십시오.
4. 출력은 JSON 객체 하나만 허용됩니다. 코드 블록, 설명 문구를 포함하지 마십시오.
카테고리 목록: ${categoryLabel}`;
}

@Service()
export class ProductResearchService {
  constructor(
    @Inject(ProductResearchJobRepositoryToken) private readonly jobRepository?: ProductResearchJobRepository,
    @Inject(CategoryRepositoryToken) private readonly categoryRepository?: CategoryRepository
  ) {}

  static researchResponseFormat() {
    return createProductResearchResponseFormat();
  }

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
    const wireProperties = createProductResearchResponseFormat().json_schema.schema.properties;
    for (const [field, value] of Object.entries(raw)) {
      if (!Object.prototype.hasOwnProperty.call(wireProperties, field))
        throw new Error(`리서치 결과의 ${field} 필드가 유효하지 않습니다.`);
      const shape = wireProperties[field as keyof typeof wireProperties];
      const acceptedTypes: readonly string[] = typeof shape.type === 'string' ? [shape.type] : shape.type;
      const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      if (
        !acceptedTypes.includes(valueType) ||
        ('maxLength' in shape && typeof value === 'string' && value.length > shape.maxLength) ||
        ('maxItems' in shape && Array.isArray(value) && value.length > shape.maxItems)
      ) {
        throw new Error(`리서치 결과의 ${field} 값이 유효하지 않습니다.`);
      }
    }
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
        } else {
          throw new Error('리서치 결과의 warning이 유효하지 않습니다.');
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
        if (
          typeof item !== 'object' ||
          item === null ||
          Array.isArray(item) ||
          Object.keys(item).some(
            key => !Object.prototype.hasOwnProperty.call(wireProperties.categoryCandidates.items.properties, key)
          )
        ) {
          throw new Error(`categoryCandidates[${index}]가 유효하지 않습니다.`);
        }
        const candidate = item as { categoryId?: unknown; reason?: unknown };
        if (typeof candidate.categoryId !== 'string') {
          throw new Error(`categoryCandidates[${index}].categoryId가 유효하지 않습니다.`);
        }
        const reason = asString(candidate.reason);
        if (!reason || reason.length > 200) {
          throw new Error(`categoryCandidates[${index}].reason이 유효하지 않습니다.`);
        }
        if (!validCategoryIds.has(candidate.categoryId)) {
          if (validCategoryIds.size === 0) continue;
          throw new Error(`categoryCandidates[${index}].categoryId가 유효하지 않습니다.`);
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
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item) ||
        Object.keys(item).some(
          key => !Object.prototype.hasOwnProperty.call(wireProperties.features.items.properties, key)
        )
      ) {
        throw new Error(`features[${index}]가 유효하지 않습니다.`);
      }
      const feature = item as { name?: unknown; summary?: unknown; emoji?: unknown; anchors?: unknown };
      const featureName = asString(feature.name);
      const featureSummary = asString(feature.summary);
      const emoji = asString(feature.emoji);
      if (
        feature.emoji !== undefined &&
        feature.emoji !== null &&
        (typeof feature.emoji !== 'string' ||
          feature.emoji.length > wireProperties.features.items.properties.emoji.maxLength)
      ) {
        throw new Error(`features[${index}].emoji가 유효하지 않습니다.`);
      }
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
        if (typeof item !== 'string' || item.length > 30) {
          throw new Error('리서치 결과의 tag가 유효하지 않습니다.');
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
        if (!parsed) throw new Error(`alternativeCandidates[${index}]가 유효하지 않습니다.`);
        alternativeCandidates.push(parsed);
        if (alternativeCandidates.length >= RESEARCH_LIMITS.maxAlternatives) {
          break;
        }
      }
    }

    pushWarnings(payload.warnings);
    const inputPath = new URL(originalUrl).pathname.replace(/\/$/, '') || '/';
    if (
      sources.some(
        source =>
          source.hostname === inputHostname && (new URL(source.url).pathname.replace(/\/$/, '') || '/') !== inputPath
      )
    ) {
      warnings.add('AMBIGUOUS_PRODUCT');
    }
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
    if (raw.length > 5) throw new Error(`${fieldName}의 근거 수가 제한을 초과했습니다.`);
    const anchors: Array<{ sourceId: string; excerpt: string }> = [];
    const seen = new Set<string>();
    for (const item of raw) {
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item) ||
        Object.keys(item).some(key => !Object.prototype.hasOwnProperty.call(researchAnchorSchema.properties, key))
      ) {
        throw new Error(`${fieldName}의 근거 형식이 유효하지 않습니다.`);
      }
      const anchor = item as { sourceId?: unknown; excerpt?: unknown };
      if (typeof anchor.sourceId !== 'string' || typeof anchor.excerpt !== 'string' || anchor.excerpt.length > 300) {
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
    // INPUT_HOST는 입력 호스트 근거라는 힌트이며 공식 인증이 아니다.
    // 같은 hostname의 여러 경로는 독립된 외부 근거로 세지 않는다.
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
    if (
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).some(key => key !== 'name' && key !== 'website' && key !== 'anchors')
    ) {
      throw new Error(`${fieldName}이 유효하지 않습니다.`);
    }
    const candidate = raw as { name?: unknown; website?: unknown; anchors?: unknown };
    if (candidate.website !== undefined && candidate.website !== null && typeof candidate.website !== 'string') {
      throw new Error(`${fieldName}.website가 유효하지 않습니다.`);
    }
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
    input: RequestProductResearchInput,
    deps: ProductResearchDependencies
  ): Promise<{ job: ProductResearchJobEntity; queued: boolean }> {
    if (typeof input.requestId !== 'string' || !isRequestId(input.requestId)) {
      throw productInvalidArgs('요청 ID 형식이 유효하지 않습니다.');
    }
    const normalized = normalizeOfficialUrl(input.officialUrl);
    if (!normalized.ok) {
      throw productInvalidArgs(normalized.reason);
    }
    const requestKey = `request:${input.requestId.trim()}`;
    const existing = await deps.jobRepository.findByRequestKey(requestKey);
    if (existing) {
      if (existing.officialUrl !== normalized.url) {
        throw productIdempotencyKeyConflict(
          '요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.'
        );
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
        throw productIdempotencyKeyConflict(
          '요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.'
        );
      }
      return { job: raced, queued: false };
    }
  }

  async retryFailedResearch(
    jobId: string,
    deps: ProductResearchDependencies,
    requestId?: string
  ): Promise<{ job: ProductResearchJobEntity; deduped: boolean }> {
    const resolved = requestId?.trim() ? requestId : randomUUID();
    if (!isRequestId(resolved)) {
      throw productInvalidArgs('요청 ID 형식이 유효하지 않습니다.');
    }
    const original = await deps.jobRepository.findById(jobId);
    if (!original) {
      throw productInvalidArgs(`존재하지 않는 조사 작업입니다: ${jobId}`);
    }
    if (original.status !== 'failed') {
      return { job: original, deduped: true };
    }
    const requestKey = `request:${resolved.trim()}`;
    try {
      const created = await deps.jobRepository.createPendingJob({
        requestKey,
        officialUrl: original.officialUrl,
        retryOfJobId: original.id,
      });
      return { job: created, deduped: created.id === original.id };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await deps.jobRepository.findByRequestKey(requestKey);
      if (!raced) {
        throw error;
      }
      if (raced.officialUrl !== original.officialUrl) {
        throw productIdempotencyKeyConflict(
          '요청 ID에 이미 다른 공식 URL이 연결되어 있습니다. 새 요청 ID로 다시 시도해 주세요.'
        );
      }
      return { job: raced, deduped: true };
    }
  }

  async executeResearch(
    jobId: string,
    deps: ProductResearchDependencies,
    leaseToken = randomUUID(),
    options?: { signal?: AbortSignal; stageBudgetMs?: number; deadline?: Date }
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
    const stageBudgetMs = Math.min(options?.stageBudgetMs ?? RESEARCH_STAGE_BUDGET_MS, RESEARCH_STAGE_BUDGET_MS);
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
      const queryResults: WebSearchResult[][] = [];
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
            return deps.jobRepository.retryJobLease({
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
            return deps.jobRepository.retryJobLease({
              jobId,
              leaseToken,
              errorCode: toFailureCode(outcome.code),
              errorMessage: outcome.message ?? '웹 검색에 실패했습니다.',
            });
          }
          continue;
        }
        queryResults.push(outcome.results.slice(0, RESEARCH_LIMITS.resultsPerQuery));
      }
      const collected: WebSearchResult[] = [];
      for (let rank = 0; rank < RESEARCH_LIMITS.resultsPerQuery; rank += 1) {
        for (const results of queryResults) {
          const result = results[rank];
          if (result) collected.push(result);
        }
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
      const model = await deps.llm.getModel();
      if (deps.llm.supportsStructuredOutput) {
        const supported = await deps.llm.supportsStructuredOutput();
        if (!supported) {
          return deps.jobRepository.failJob({
            jobId,
            leaseToken,
            errorCode: 'LLM_STRUCTURED_OUTPUT_UNSUPPORTED',
            errorMessage: '현재 LLM 모델은 구조화 응답을 지원하지 않습니다. 구조화 응답 지원 모델을 선택해 주세요.',
          });
        }
      }
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
          {
            maxRetries: 1,
            baseDelay: 1000,
            maxDelay: 5000,
            signal: options?.signal,
            deadline: options?.deadline,
          }
        );
      } catch (error) {
        // 호출자 abort는 terminal failJob 없이 lease 만료·recovery에 맡긴다.
        if (isAbortError(error) || options?.signal?.aborted) {
          console.warn(`[ProductResearchService] Job ${jobId} aborted during LLM stage; leaving lease to expire.`);
          return job;
        }
        if (isStructuredOutputUnsupported(error)) {
          return deps.jobRepository.failJob({
            jobId,
            leaseToken,
            errorCode: 'LLM_STRUCTURED_OUTPUT_UNSUPPORTED',
            errorMessage: error instanceof Error ? error.message : '구조화 응답 미지원 모델입니다.',
          });
        }
        return deps.jobRepository.retryJobLease({
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
      throwIfAborted(options?.signal);
      if (options?.deadline && options.deadline.getTime() - Date.now() < JOB_COMMIT_MARGIN_MS) return job;
      return deps.jobRepository.completeJob({
        jobId,
        leaseToken,
        commitBefore: options?.deadline ? new Date(options.deadline.getTime() - JOB_COMMIT_MARGIN_MS) : undefined,
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
      return deps.jobRepository.retryJobLease({
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
