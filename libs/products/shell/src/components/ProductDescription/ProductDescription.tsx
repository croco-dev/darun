import { bind } from '@croco/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';

import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  if (!description) {
    return null;
  }

  return (
    <div className="text-[15px] font-normal leading-[1.5] text-dark-700 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-dark-900 [&_blockquote]:bg-dark-100 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-dark-900 [&_blockquote]:not-italic [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-100 [&_p]:my-1 [&_p.blank]:hidden">
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }} />
    </div>
  );
});
