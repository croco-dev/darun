'use client';

import { ContentArea } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ProductTableOfContent } from '../../components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <div className="h-12" />}
    <div
      className={`${isFixed ? 'fixed shadow-card' : 'relative'} w-full z-[100] bg-white/95 backdrop-blur-sm border-b border-dark-150 top-0`}
    >
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  </>
));
