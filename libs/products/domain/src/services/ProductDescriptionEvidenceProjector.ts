import crypto from 'node:crypto';
import { BlockList, isIP } from 'node:net';

export type ProductDescriptionEvidenceItem =
  | {
      id: 'product:summary';
      kind: 'product_summary';
      text: string;
    }
  | {
      id: `category:${string}`;
      kind: 'category';
      text: string;
    }
  | {
      id: `feature:${string}`;
      kind: 'feature';
      title: string;
      text?: string;
    }
  | {
      id: `tag:${string}`;
      kind: 'tag';
      text: string;
    }
  | {
      id: `link:${string}`;
      kind: 'link';
      title: string;
      url: string;
      displayText: string;
    }
  | {
      id: `screenshot:${string}`;
      kind: 'screenshot';
      title?: string;
      alt: string;
      platform?: string;
      screenType?: string;
    }
  | {
      id: `flow:${string}`;
      kind: 'flow';
      title: string;
      description: string;
      platform: string;
      stepCount: number;
      stepCaptions: string[];
    }
  | {
      id: `research:${string}`;
      kind: 'research';
      title: string;
      snippet: string;
      hostname: string;
      url: string;
    };

export type ProductDescriptionEvidence = {
  productId: string;
  productName: string;
  items: ProductDescriptionEvidenceItem[];
};

/**
 * 근거 해시 형식 버전.
 * - v2: links.displayText를 포함해 모델이 실제로 읽은 확장 근거 입력 전체를 반영한다.
 * - v1: displayText가 빠진 역사적 형식. 미적용 legacy 후보의 안전 읽기 비교에만 사용한다.
 */
export type ProductDescriptionEvidenceHashVersion = 'v2';

export type AssembledProductDescriptionEvidence = {
  evidence: ProductDescriptionEvidence;
  evidenceHashVersion: ProductDescriptionEvidenceHashVersion;
  /** v2 canonical 입력의 sha256. */
  evidenceHash: string;
  /** v1 canonical 입력의 sha256. legacy 미적용 후보 비교 전용이며 v2 입력에서 displayText를 제외해 계산한다. */
  legacyEvidenceHash: string;
  baseDescriptionHash: string;
};

export function normalizeString(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function computeSha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** 근거 수집·저장용 URL 정리. http(s)만 허용하며 원본 저장 URL과 같은 기준을 유지한다. */
export function safeEvidenceUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

const INTERNAL_HOSTNAME_SUFFIXES = ['.local', '.localhost', '.lan', '.internal', '.intranet', '.localdomain'];

const INTERNAL_IP_RANGES = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  INTERNAL_IP_RANGES.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] as const) {
  INTERNAL_IP_RANGES.addSubnet(address, prefix, 'ipv6');
}

/**
 * 독자가 클릭하게 되는 rich link URL 검증. 서버가 직접 접속하지 않는 클릭 링크
 * 위생 검사이며(SSRF DNS 조회가 아님) 근거 원본 저장 URL 기준(safeEvidenceUrl)과 분리된다.
 * http(s), credential 없음, 내부 hostname·사설/예약 IP·metadata literal 거절을 강제한다.
 */
export function safeReaderFacingUrl(rawUrl: string): string | null {
  const evidenceUrl = safeEvidenceUrl(rawUrl);
  if (!evidenceUrl) {
    return null;
  }
  const parsed = new URL(evidenceUrl);
  if (parsed.username || parsed.password) {
    return null;
  }
  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (!hostname.includes('.') && !hostname.includes(':')) {
    return null;
  }
  if (hostname === 'localhost' || INTERNAL_HOSTNAME_SUFFIXES.some(suffix => hostname.endsWith(suffix))) {
    return null;
  }
  const ipVersion = isIP(hostname);
  if (ipVersion !== 0 && INTERNAL_IP_RANGES.check(hostname, ipVersion === 4 ? 'ipv4' : 'ipv6')) {
    return null;
  }
  return evidenceUrl;
}

export function truncateEvidenceText(text: string, maxLength: number): string {
  const normalized = normalizeString(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).trimEnd();
}

export const MAX_EVIDENCE_TAGS = 8;
export const MAX_EVIDENCE_LINKS = 3;
export const MAX_EVIDENCE_SCREENSHOTS = 3;
export const MAX_EVIDENCE_FLOWS = 2;
export const MAX_EVIDENCE_RESEARCH_SOURCES = 3;
export const MAX_EVIDENCE_BULLETS = 4;
export const MAX_EVIDENCE_BULLET_LENGTH = 200;

export type ProductDescriptionEvidenceSources = {
  product: {
    id: string;
    name: string;
    summary: string;
    description: string;
    categoryIds: string[];
  };
  /** product.categoryIds 순서와 1:1로 정렬된 category 조회 결과. 행 부재는 null. */
  categories: Array<{ id: string; labelKo: string; labelEn: string } | null>;
  features: Array<{ id: string; name: string; summary?: string | null }>;
  /** 정렬 전 태그 이름 원본. */
  tags: string[];
  links: Array<{
    id: string;
    title: string;
    link: string;
    displayLink: string;
  }>;
  screenshots: Array<{
    id: string;
    title?: string | null;
    imageAlt: string;
    priority?: number;
    platform?: string | null;
    screenType?: string | null;
  }>;
  flows: Array<{
    id: string;
    title: string;
    description: string;
    platform: string;
    steps: Array<{ caption: string }>;
  }>;
  researchSources: Array<{
    id?: string | null;
    title: string;
    snippet: string;
    extraSnippets?: string[] | null;
    hostname: string;
    url: string;
  }>;
};

type CanonicalEvidenceData = {
  productId: string;
  productName: string;
  summary: string;
  categories: Array<{ id: string; label: string }>;
  features: Array<{ id: string; name: string; summary: string }>;
  tags: Array<{ id: string; text: string }>;
  links: Array<{ id: string; title: string; url: string; displayText: string }>;
  screenshots: Array<{
    id: string;
    title: string;
    alt: string;
    platform: string;
    screenType: string;
  }>;
  flows: Array<{
    id: string;
    title: string;
    description: string;
    platform: string;
    stepCount: number;
    stepCaptions: string[];
  }>;
  research: Array<{
    id: string;
    title: string;
    snippet: string;
    hostname: string;
    url: string;
  }>;
};

/**
 * 순수 근거 projector. DB 읽기와 분리되며 정규화·정렬·기존 quota와 근거 해시를 만든다.
 * 해시 입력은 모델이 실제로 읽은 선택 근거 전체이며(v2, links.displayText 포함),
 * legacyEvidenceHash는 같은 입력에서 displayText만 제외한 v1 형식이다.
 */
export function projectProductDescriptionEvidence(
  sources: ProductDescriptionEvidenceSources
): AssembledProductDescriptionEvidence {
  const normalizedProductName = normalizeString(sources.product.name);
  const normalizedProductSummary = normalizeString(sources.product.summary);

  const resolvedCategories = sources.product.categoryIds.map((categoryId, index) => {
    const category = sources.categories[index];
    if (!category) {
      throw new Error(`Category not found for id: ${categoryId}`);
    }
    const label = normalizeString(category.labelKo || category.labelEn || '');
    if (!label) {
      throw new Error(`Category label is empty for category: ${categoryId}`);
    }
    return { id: category.id, label };
  });
  const sortedCategories = [...resolvedCategories].sort((a, b) => a.id.localeCompare(b.id));

  const sortedFeatures = [...sources.features].sort((a, b) => a.id.localeCompare(b.id));

  const items: ProductDescriptionEvidenceItem[] = [
    {
      id: 'product:summary',
      kind: 'product_summary',
      text: normalizedProductSummary,
    },
  ];

  for (const cat of sortedCategories) {
    items.push({
      id: `category:${cat.id}`,
      kind: 'category',
      text: cat.label,
    });
  }

  for (const feat of sortedFeatures) {
    const normalizedSummary = feat.summary ? normalizeString(feat.summary) : undefined;
    items.push({
      id: `feature:${feat.id}`,
      kind: 'feature',
      title: normalizeString(feat.name),
      ...(normalizedSummary ? { text: normalizedSummary } : {}),
    });
  }

  const tagItems = collectTagItems(sources.tags);
  const linkItems = collectLinkItems(sources.links);
  const screenshotItems = collectScreenshotItems(sources.screenshots);
  const flowItems = collectFlowItems(sources.flows);
  const researchItems = collectResearchItems(sources.researchSources);
  items.push(...tagItems, ...linkItems, ...screenshotItems, ...flowItems, ...researchItems);

  const canonicalEvidenceData: CanonicalEvidenceData = {
    productId: sources.product.id,
    productName: normalizedProductName,
    summary: normalizedProductSummary,
    categories: sortedCategories.map(c => ({ id: c.id, label: c.label })),
    features: sortedFeatures.map(f => ({
      id: f.id,
      name: normalizeString(f.name),
      summary: f.summary ? normalizeString(f.summary) : '',
    })),
    tags: tagItems.map(item => ({ id: item.id, text: item.text })),
    links: linkItems.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      displayText: item.displayText,
    })),
    screenshots: screenshotItems.map(item => ({
      id: item.id,
      title: item.title ?? '',
      alt: item.alt,
      platform: item.platform ?? '',
      screenType: item.screenType ?? '',
    })),
    flows: flowItems.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      platform: item.platform,
      stepCount: item.stepCount,
      stepCaptions: item.stepCaptions,
    })),
    research: researchItems.map(item => ({
      id: item.id,
      title: item.title,
      snippet: item.snippet,
      hostname: item.hostname,
      url: item.url,
    })),
  };

  const legacyCanonicalEvidenceData: Omit<CanonicalEvidenceData, 'links'> & {
    links: Array<{ id: string; title: string; url: string }>;
  } = {
    ...canonicalEvidenceData,
    links: canonicalEvidenceData.links.map(({ displayText: _displayText, ...link }) => link),
  };

  return {
    evidence: {
      productId: sources.product.id,
      productName: normalizedProductName,
      items,
    },
    evidenceHashVersion: 'v2',
    evidenceHash: computeSha256(JSON.stringify(canonicalEvidenceData)),
    legacyEvidenceHash: computeSha256(JSON.stringify(legacyCanonicalEvidenceData)),
    baseDescriptionHash: computeSha256(normalizeString(sources.product.description || '')),
  };
}

function collectTagItems(tagNames: string[]): Extract<ProductDescriptionEvidenceItem, { kind: 'tag' }>[] {
  return tagNames
    .map(tag => normalizeString(tag))
    .filter(tag => tag.length > 0)
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .slice(0, MAX_EVIDENCE_TAGS)
    .map(tag => ({
      id: `tag:${tag}` as const,
      kind: 'tag' as const,
      text: tag,
    }));
}

function collectLinkItems(
  links: ProductDescriptionEvidenceSources['links']
): Extract<ProductDescriptionEvidenceItem, { kind: 'link' }>[] {
  return [...links]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_EVIDENCE_LINKS)
    .flatMap(link => {
      const safeUrl = safeEvidenceUrl(link.link);
      if (!safeUrl) {
        return [];
      }
      const title = normalizeString(link.title || link.displayLink || safeUrl);
      if (!title) {
        return [];
      }
      return [
        {
          id: `link:${link.id}` as const,
          kind: 'link' as const,
          title,
          url: safeUrl,
          displayText: normalizeString(link.displayLink || safeUrl),
        },
      ];
    });
}

function collectScreenshotItems(
  screenshots: ProductDescriptionEvidenceSources['screenshots']
): Extract<ProductDescriptionEvidenceItem, { kind: 'screenshot' }>[] {
  return [...screenshots]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))
    .slice(0, MAX_EVIDENCE_SCREENSHOTS)
    .flatMap(screenshot => {
      const alt = normalizeString(screenshot.imageAlt || screenshot.title || '');
      if (!alt) {
        return [];
      }
      return [
        {
          id: `screenshot:${screenshot.id}` as const,
          kind: 'screenshot' as const,
          ...(screenshot.title ? { title: normalizeString(screenshot.title) } : {}),
          alt,
          ...(screenshot.platform ? { platform: screenshot.platform } : {}),
          ...(screenshot.screenType ? { screenType: screenshot.screenType } : {}),
        },
      ];
    });
}

function collectFlowItems(
  flows: ProductDescriptionEvidenceSources['flows']
): Extract<ProductDescriptionEvidenceItem, { kind: 'flow' }>[] {
  return [...flows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_EVIDENCE_FLOWS)
    .flatMap(flow => {
      const title = normalizeString(flow.title);
      const description = normalizeString(flow.description);
      if (!title || !description) {
        return [];
      }
      const stepCaptions = flow.steps
        .map(step => normalizeString(step.caption))
        .filter(caption => caption.length > 0)
        .slice(0, 5);
      return [
        {
          id: `flow:${flow.id}` as const,
          kind: 'flow' as const,
          title,
          description,
          platform: normalizeString(flow.platform),
          stepCount: flow.steps.length,
          stepCaptions,
        },
      ];
    });
}

function collectResearchItems(
  researchSources: ProductDescriptionEvidenceSources['researchSources']
): Extract<ProductDescriptionEvidenceItem, { kind: 'research' }>[] {
  return researchSources.slice(0, MAX_EVIDENCE_RESEARCH_SOURCES).flatMap((source, index) => {
    const title = normalizeString(source.title);
    const snippet = normalizeString([source.snippet, ...(source.extraSnippets ?? [])].filter(Boolean).join(' '));
    const hostname = normalizeString(source.hostname);
    const safeUrl = safeEvidenceUrl(source.url);
    if (!title || !snippet || !hostname || !safeUrl) {
      return [];
    }
    return [
      {
        id: `research:${source.id || `source-${index}`}` as const,
        kind: 'research' as const,
        title: truncateEvidenceText(title, 120),
        snippet: truncateEvidenceText(snippet, 300),
        hostname,
        url: safeUrl,
      },
    ];
  });
}
