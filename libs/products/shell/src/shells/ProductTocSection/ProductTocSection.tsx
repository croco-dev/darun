'use client';

import { bind } from '@croco/utils-structure-react';
import { ContentArea } from '@darun/ui-foundation';
import { ProductTableOfContent } from '../../components';
import { useProductTocSection } from './useProductTocSection';

export const ProductTocSection = bind(useProductTocSection, ({ isFixed }) => (
  <>
    {isFixed && <div className="h-10" />}
    <div
      className={`${isFixed ? 'fixed shadow-md' : 'relative'} w-full z-[100] bg-dark-000 border-y border-dark-100 top-0`}
    >
      <ContentArea>
        <ProductTableOfContent />
      </ContentArea>
    </div>
  </>
));
