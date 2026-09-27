'use client';

import { ContentArea } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { ProductTableOfContent } from '../../components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <div aria-hidden="true" className="h-11 sm:h-12" />}
    <div
      className={`${isFixed ? 'fixed top-[61px] shadow-2xs border-b' : 'relative border-y'} w-full z-30 border-dark-150/80 bg-white/90 backdrop-blur-md transition-shadow duration-200 motion-reduce:transition-none`}
    >
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  </>
));
