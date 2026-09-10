'use client';

import { ContentArea } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ProductTableOfContent } from '../../components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <div className="h-14" />}
    <div
      className={`${isFixed ? 'fixed top-16 shadow-xs border-b' : 'relative border-y'} w-full z-30 border-dark-150 bg-white/90 backdrop-blur transition-shadow duration-200 motion-reduce:transition-none`}
    >
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  </>
));
