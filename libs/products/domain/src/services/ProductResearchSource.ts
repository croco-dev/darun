import { createHash } from 'node:crypto';
import type { ResearchSource } from '../entities/ProductResearchJobEntity';

const MAX_SOURCE_SNIPPET_CHARS = 700;
const MAX_EXTRA_SNIPPETS_PER_SOURCE = 3;

export const RESEARCH_LIMITS = {
  maxSearchQueries: 5,
  resultsPerQuery: 5,
  maxUniqueSources: 15,
  maxSnippetChars: MAX_SOURCE_SNIPPET_CHARS,
  maxExtraSnippetsPerSource: MAX_EXTRA_SNIPPETS_PER_SOURCE,
  maxFeatures: 8,
  maxTags: 10,
  maxAlternatives: 8,
  maxOutputSummaryChars: 255,
} as const;

export type NormalizedResearchSource = ResearchSource;

function canonicalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isSameHostOrSubdomain(candidateHostname: string, inputHostname: string): boolean {
  const candidate = candidateHostname.toLowerCase();
  const input = inputHostname.toLowerCase();
  if (candidate === input) {
    return true;
  }
  return candidate.endsWith(`.${input}`);
}

export type RawSearchSource = {
  title: string;
  url: string;
  description: string;
  extraSnippets?: string[];
};

export function normalizeResearchSources(
  rawSources: RawSearchSource[],
  inputHostname: string
): NormalizedResearchSource[] {
  const sourceByUrl = new Map<string, NormalizedResearchSource>();
  const collected: NormalizedResearchSource[] = [];

  for (const raw of rawSources.slice(0, RESEARCH_LIMITS.maxSearchQueries * RESEARCH_LIMITS.resultsPerQuery)) {
    const canonical = canonicalizeUrl(raw.url);
    if (!canonical) {
      continue;
    }
    let source = sourceByUrl.get(canonical);
    if (!source) {
      if (collected.length >= RESEARCH_LIMITS.maxUniqueSources) {
        continue;
      }
      const hostname = hostnameOf(canonical);
      if (!hostname) {
        continue;
      }
      source = {
        id: `s${collected.length + 1}`,
        title: raw.title.trim().slice(0, 300),
        url: canonical,
        hostname,
        snippet: '',
        extraSnippets: [],
        relationToInput: isSameHostOrSubdomain(hostname, inputHostname) ? 'INPUT_HOST_MATCH' : 'EXTERNAL',
      };
      sourceByUrl.set(canonical, source);
      collected.push(source);
    }

    for (const excerpt of [raw.description, ...(raw.extraSnippets ?? [])]) {
      const snippet = excerpt.trim().slice(0, MAX_SOURCE_SNIPPET_CHARS);
      const normalized = normalizeWhitespace(snippet);
      if (
        !normalized ||
        [source.snippet, ...source.extraSnippets].some(existing => normalizeWhitespace(existing) === normalized)
      ) {
        continue;
      }
      if (!source.snippet) {
        source.snippet = snippet;
      } else if (source.extraSnippets.length < MAX_EXTRA_SNIPPETS_PER_SOURCE) {
        source.extraSnippets.push(snippet);
      }
    }
  }

  return collected;
}

export function hashSourceSnapshot(sources: NormalizedResearchSource[]): string {
  const canonical = sources.map(source => ({
    url: source.url,
    title: source.title,
    snippet: source.snippet,
    extraSnippets: [...source.extraSnippets].sort(),
  }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isAnchorExcerptPresent(
  excerpt: string,
  source: NormalizedResearchSource,
  maxExcerptChars = 300
): boolean {
  const normalizedExcerpt = normalizeWhitespace(excerpt);
  if (normalizedExcerpt.length === 0 || normalizedExcerpt.length > maxExcerptChars) {
    return false;
  }
  const haystacks = [source.title, source.snippet, ...source.extraSnippets].map(normalizeWhitespace);
  return haystacks.some(haystack => haystack.includes(normalizedExcerpt));
}
