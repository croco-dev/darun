'use client';

import { ContentArea } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ProductTableOfContent } from '../../components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <div className="h-12" />}
    <div
      className={`${isFixed ? 'fixed shadow-elevated' : 'relative'} w-full z-[100] border-b border-dark-150 bg-white/90 backdrop-blur top-0 transition-shadow duration-200 motion-reduce:transition-none`}
    >
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  </>
));
