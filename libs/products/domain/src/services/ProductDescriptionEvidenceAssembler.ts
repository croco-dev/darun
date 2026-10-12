import { Inject, Service, Token } from 'typedi';
import crypto from 'node:crypto';
import { productNotFound } from '../errors/productError';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';
import type { ProductFlowRepository } from '../repositories/ProductFlowRepository';
import { ProductFlowRepositoryToken } from '../repositories/ProductFlowRepository';
import type { ProductLinkRepository } from '../repositories/ProductLinkRepository';
import { ProductLinkRepositoryToken } from '../repositories/ProductLinkRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';
import type { ProductResearchJobRepository } from '../repositories/ProductResearchJobRepository';
import { ProductResearchJobRepositoryToken } from '../repositories/ProductResearchJobRepository';
import type { ProductScreenshotRepository } from '../repositories/ProductScreenshotRepository';
import { ProductScreenshotRepositoryToken } from '../repositories/ProductScreenshotRepository';
import type { ProductTagRepository } from '../repositories/ProductTagRepository';
import { ProductTagRepositoryToken } from '../repositories/ProductTagRepository';

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

export type AssembledProductDescriptionEvidence = {
  evidence: ProductDescriptionEvidence;
  evidenceHash: string;
  baseDescriptionHash: string;
};

export type EvidenceSnapshotInput = {
  product: { id: string; name: string; summary: string; description?: string; categoryIds: string[] };
  categories: Array<{ id: string; label: string }>;
  features: Array<{ id: string; name: string; summary?: string }>;
  tags: string[];
  links: Array<{ id: `link:${string}` | string; title: string; url: string; displayText: string }>;
  screenshots: Array<{
    id: `screenshot:${string}` | string;
    title?: string;
    alt: string;
    platform?: string;
    screenType?: string;
  }>;
  flows: Array<{
    id: `flow:${string}` | string;
    title: string;
    description: string;
    platform: string;
    stepCount: number;
    stepCaptions: string[];
  }>;
  research: Array<{
    id: `research:${string}` | string;
    title: string;
    snippet: string;
    hostname: string;
    url: string;
  }>;
};

/**
 * generate·apply·translation이 공유하는 canonical evidence projector.
 * 같은 입력에 대해 같은 evidenceHash/baseDescriptionHash를 만든다.
 */
export function projectEvidenceSnapshot(input: EvidenceSnapshotInput): AssembledProductDescriptionEvidence {
  const sortedCategories = [...input.categories].sort((a, b) => a.id.localeCompare(b.id));
  const sortedFeatures = [...input.features].sort((a, b) => a.id.localeCompare(b.id));
  const normalizedProductName = normalizeString(input.product.name);
  const normalizedProductSummary = normalizeString(input.product.summary);

  const tagItems: Extract<ProductDescriptionEvidenceItem, { kind: 'tag' }>[] = [...input.tags]
    .map(tag => normalizeString(tag))
    .filter(name => name.length > 0)
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .slice(0, MAX_EVIDENCE_TAGS)
    .map(tag => ({ id: `tag:${tag}` as const, kind: 'tag' as const, text: tag }));

  const linkItems: Extract<ProductDescriptionEvidenceItem, { kind: 'link' }>[] = [...input.links]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_EVIDENCE_LINKS)
    .map(link => ({
      id: link.id.startsWith('link:') ? (link.id as `link:${string}`) : (`link:${link.id}` as const),
      kind: 'link' as const,
      title: normalizeString(link.title),
      url: link.url,
      displayText: normalizeString(link.displayText || link.url),
    }));

  const screenshotItems: Extract<ProductDescriptionEvidenceItem, { kind: 'screenshot' }>[] = input.screenshots
    .slice(0, MAX_EVIDENCE_SCREENSHOTS)
    .map(item => ({
      id: (item.id.startsWith('screenshot:') ? item.id : `screenshot:${item.id}`) as `screenshot:${string}`,
      kind: 'screenshot' as const,
      ...(item.title ? { title: item.title } : {}),
      alt: item.alt,
      ...(item.platform ? { platform: item.platform } : {}),
      ...(item.screenType ? { screenType: item.screenType } : {}),
    }));

  const flowItems: Extract<ProductDescriptionEvidenceItem, { kind: 'flow' }>[] = [...input.flows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, MAX_EVIDENCE_FLOWS)
    .map(item => ({
      id: (item.id.startsWith('flow:') ? item.id : `flow:${item.id}`) as `flow:${string}`,
      kind: 'flow' as const,
      title: item.title,
      description: item.description,
      platform: item.platform,
      stepCount: item.stepCount,
      stepCaptions: item.stepCaptions,
    }));

  const researchItems: Extract<ProductDescriptionEvidenceItem, { kind: 'research' }>[] = input.research
    .slice(0, MAX_EVIDENCE_RESEARCH_SOURCES)
    .map(item => ({
      id: (item.id.startsWith('research:') ? item.id : `research:${item.id}`) as `research:${string}`,
      kind: 'research' as const,
      title: item.title,
      snippet: item.snippet,
      hostname: item.hostname,
      url: item.url,
    }));

  const items: ProductDescriptionEvidenceItem[] = [
    { id: 'product:summary', kind: 'product_summary', text: normalizedProductSummary },
    ...sortedCategories.map((cat): ProductDescriptionEvidenceItem => ({
      id: `category:${cat.id}`,
      kind: 'category',
      text: cat.label,
    })),
    ...sortedFeatures.map((feat): ProductDescriptionEvidenceItem => ({
      id: `feature:${feat.id}`,
      kind: 'feature',
      title: normalizeString(feat.name),
      ...(feat.summary && normalizeString(feat.summary) ? { text: normalizeString(feat.summary) } : {}),
    })),
    ...tagItems,
    ...linkItems,
    ...screenshotItems,
    ...flowItems,
    ...researchItems,
  ];

  const canonicalEvidenceData = {
    productId: input.product.id,
    productName: normalizedProductName,
    summary: normalizedProductSummary,
    categories: sortedCategories.map(c => ({ id: c.id, label: c.label })),
    features: sortedFeatures.map(f => ({
      id: f.id,
      name: normalizeString(f.name),
      summary: f.summary ? normalizeString(f.summary) : '',
    })),
    tags: tagItems.map(item => ({ id: item.id, text: item.text })),
    links: linkItems.map(item => ({ id: item.id, title: item.title, url: item.url })),
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

  const evidenceHash = computeSha256(JSON.stringify(canonicalEvidenceData));
  const baseDescriptionHash = computeSha256(normalizeString(input.product.description || ''));

  return {
    evidence: { productId: input.product.id, productName: normalizedProductName, items },
    evidenceHash,
    baseDescriptionHash,
  };
}

export function normalizeString(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function computeSha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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
    // Reject credentialed URLs: userinfo leaks into rendered anchors and
    // breaks exact-match comparison against evidence URLs.
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
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

export interface IProductDescriptionEvidenceAssembler {
  assemble(productId: string): Promise<AssembledProductDescriptionEvidence>;
}

export const ProductDescriptionEvidenceAssemblerToken = new Token<IProductDescriptionEvidenceAssembler>(
  'ProductDescriptionEvidenceAssembler'
);

@Service(ProductDescriptionEvidenceAssemblerToken)
@Service()
export class ProductDescriptionEvidenceAssembler implements IProductDescriptionEvidenceAssembler {
  constructor(
    @Inject(ProductRepositoryToken)
    private readonly productRepository: ProductRepository,
    @Inject(ProductFeatureRepositoryToken)
    private readonly productFeatureRepository: ProductFeatureRepository,
    @Inject(CategoryRepositoryToken)
    private readonly categoryRepository: CategoryRepository,
    @Inject(ProductTagRepositoryToken)
    private readonly productTagRepository: ProductTagRepository,
    @Inject(ProductLinkRepositoryToken)
    private readonly productLinkRepository: ProductLinkRepository,
    @Inject(ProductScreenshotRepositoryToken)
    private readonly productScreenshotRepository: ProductScreenshotRepository,
    @Inject(ProductFlowRepositoryToken)
    private readonly productFlowRepository: ProductFlowRepository,
    @Inject(ProductResearchJobRepositoryToken)
    private readonly productResearchJobRepository: ProductResearchJobRepository
  ) {}

  async assemble(productId: string): Promise<AssembledProductDescriptionEvidence> {
    const product = await this.productRepository.findOneById(productId);
    if (!product) {
      throw productNotFound();
    }

    const rawFeatures = await this.productFeatureRepository.findManyByProductId(productId);
    const sortedFeatures = [...rawFeatures].sort((a, b) => a.id.localeCompare(b.id));

    const categoryIds = product.categoryIds ?? [];
    const resolvedCategories = await Promise.all(
      categoryIds.map(async categoryId => {
        const category = await this.categoryRepository.findOneById(categoryId);
        if (!category) {
          throw new Error(`Category not found for id: ${categoryId}`);
        }
        const label = normalizeString(category.labelKo || category.labelEn || '');
        if (!label) {
          throw new Error(`Category label is empty for category: ${categoryId}`);
        }
        return {
          id: category.id,
          label,
        };
      })
    );
    const sortedCategories = [...resolvedCategories].sort((a, b) => a.id.localeCompare(b.id));

    const tagItems = await this.collectTagItems(productId);
    const linkItems = await this.collectLinkItems(productId);
    const screenshotItems = await this.collectScreenshotItems(productId);
    const flowItems = await this.collectFlowItems(productId);
    const researchItems = await this.collectResearchItems(productId);

    return projectEvidenceSnapshot({
      product: {
        id: product.id,
        name: product.name,
        summary: product.summary,
        description: product.description,
        categoryIds,
      },
      categories: sortedCategories,
      features: sortedFeatures.map(f => ({ id: f.id, name: f.name, summary: f.summary })),
      tags: tagItems.map(item => item.text),
      links: linkItems.map(item => ({ id: item.id, title: item.title, url: item.url, displayText: item.displayText })),
      screenshots: screenshotItems,
      flows: flowItems,
      research: researchItems,
    });
  }

  private async collectTagItems(
    productId: string
  ): Promise<Extract<ProductDescriptionEvidenceItem, { kind: 'tag' }>[]> {
    if (!this.productTagRepository) {
      return [];
    }
    const productTag = await this.productTagRepository.findOneByProductId(productId);
    const tags = (productTag?.tags ?? [])
      .map(tag => normalizeString(tag.name))
      .filter(name => name.length > 0)
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .slice(0, MAX_EVIDENCE_TAGS);
    return tags.map(tag => ({
      id: `tag:${tag}` as const,
      kind: 'tag' as const,
      text: tag,
    }));
  }

  private async collectLinkItems(
    productId: string
  ): Promise<Extract<ProductDescriptionEvidenceItem, { kind: 'link' }>[]> {
    if (!this.productLinkRepository) {
      return [];
    }
    const links = await this.productLinkRepository.findManyByProductId(productId);
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

  private async collectScreenshotItems(
    productId: string
  ): Promise<Extract<ProductDescriptionEvidenceItem, { kind: 'screenshot' }>[]> {
    if (!this.productScreenshotRepository) {
      return [];
    }
    const screenshots = await this.productScreenshotRepository.findManyByProductIdSortByPriorityDesc(productId);
    return screenshots.slice(0, MAX_EVIDENCE_SCREENSHOTS).flatMap(screenshot => {
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

  private async collectFlowItems(
    productId: string
  ): Promise<Extract<ProductDescriptionEvidenceItem, { kind: 'flow' }>[]> {
    if (!this.productFlowRepository) {
      return [];
    }
    const flows = await this.productFlowRepository.findManyByProductId(productId);
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

  private async collectResearchItems(
    productId: string
  ): Promise<Extract<ProductDescriptionEvidenceItem, { kind: 'research' }>[]> {
    if (!this.productResearchJobRepository) {
      return [];
    }
    const job = await this.productResearchJobRepository.findByProductId(productId);
    const result = job?.status === 'completed' ? job.result : null;
    if (!result || !Array.isArray(result.sources)) {
      return [];
    }
    return result.sources.slice(0, MAX_EVIDENCE_RESEARCH_SOURCES).flatMap((source, index) => {
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
}
