import { Inject, Service } from 'typedi';
import type { ProductDescriptionDocument } from '../services/ProductDescriptionDocument';
import {
  type IProductDescriptionEvidenceAssembler,
  ProductDescriptionEvidenceAssembler,
  ProductDescriptionEvidenceAssemblerToken,
} from '../services/ProductDescriptionEvidenceAssembler';
import {
  type ProductDescriptionGenerator,
  ProductDescriptionGeneratorToken,
} from '../services/ProductDescriptionGenerator';

export type GenerateProductDescriptionCandidateResult = {
  candidateDocument: ProductDescriptionDocument;
  candidateHtml: string;
  evidenceHash: string;
  baseDescriptionHash: string;
  writerModel: string;
  reviewerModel: string;
  writerPromptVersion: string;
  reviewerPromptVersion: string;
  rendererVersion: string;
};

@Service()
export class GenerateProductDescriptionCandidate {
  constructor(
    @Inject(ProductDescriptionEvidenceAssemblerToken)
    private readonly evidenceAssembler: IProductDescriptionEvidenceAssembler,
    @Inject(ProductDescriptionGeneratorToken)
    private readonly productDescriptionGenerator: ProductDescriptionGenerator
  ) {}

  async execute({ productId }: { productId: string }): Promise<GenerateProductDescriptionCandidateResult> {
    const startSnapshot = await this.evidenceAssembler.assemble(productId);

    const generationResult = await this.productDescriptionGenerator.generate(startSnapshot.evidence);

    const currentSnapshot = await this.evidenceAssembler.assemble(productId);
    if (
      currentSnapshot.evidenceHash !== startSnapshot.evidenceHash ||
      currentSnapshot.baseDescriptionHash !== startSnapshot.baseDescriptionHash
    ) {
      throw new Error('stale: 제품 정보가 생성 도중 변경되었습니다.');
    }

    return {
      candidateDocument: generationResult.document,
      candidateHtml: generationResult.candidateHtml,
      evidenceHash: startSnapshot.evidenceHash,
      baseDescriptionHash: startSnapshot.baseDescriptionHash,
      writerModel: generationResult.writerModel,
      reviewerModel: generationResult.reviewerModel,
      writerPromptVersion: generationResult.writerPromptVersion,
      reviewerPromptVersion: generationResult.reviewerPromptVersion,
      rendererVersion: generationResult.rendererVersion,
    };
  }
}

// Alias for backwards compatibility
export const GenerateProductDescription = GenerateProductDescriptionCandidate;
export type GenerateProductDescription = GenerateProductDescriptionCandidate;
