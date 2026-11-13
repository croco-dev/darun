'use client';

import { ContentArea } from '@darun/ui';
import { ProductTableOfContent } from '../../components';

export function ProductTocSection() {
  return (
    <div className="sticky top-[var(--product-header-height,61px)] z-30 w-full border-y border-dark-150/80 bg-white/90 backdrop-blur-md">
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  );
}
