import { Token } from 'typedi';
import type { AssembledProductDescriptionEvidence } from './ProductDescriptionEvidenceProjector';

/** Fresh evidence snapshot port; the PostgreSQL adapter owns transactional reads. */
export interface IProductDescriptionEvidenceAssembler {
  assemble(productId: string): Promise<AssembledProductDescriptionEvidence>;
}

export const ProductDescriptionEvidenceAssemblerToken = new Token<IProductDescriptionEvidenceAssembler>(
  'ProductDescriptionEvidenceAssembler'
);
