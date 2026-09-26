import { Inject, Service, Token } from 'typedi';
import crypto from 'node:crypto';
import { productNotFound } from '../errors/productError';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryRepositoryToken } from '../repositories/CategoryRepository';
import type { ProductFeatureRepository } from '../repositories/ProductFeatureRepository';
import { ProductFeatureRepositoryToken } from '../repositories/ProductFeatureRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import { ProductRepositoryToken } from '../repositories/ProductRepository';

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

export function normalizeString(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export function computeSha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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
    private readonly categoryRepository: CategoryRepository
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

    const normalizedProductName = normalizeString(product.name);
    const normalizedProductSummary = normalizeString(product.summary);

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

    const canonicalEvidenceData = {
      productId: product.id,
      productName: normalizedProductName,
      summary: normalizedProductSummary,
      categories: sortedCategories.map(c => ({
        id: c.id,
        label: c.label,
      })),
      features: sortedFeatures.map(f => ({
        id: f.id,
        name: normalizeString(f.name),
        summary: f.summary ? normalizeString(f.summary) : '',
      })),
    };

    const evidenceHash = computeSha256(JSON.stringify(canonicalEvidenceData));
    const baseDescriptionHash = computeSha256(normalizeString(product.description || ''));

    return {
      evidence: {
        productId: product.id,
        productName: normalizedProductName,
        items,
      },
      evidenceHash,
      baseDescriptionHash,
    };
  }
}
