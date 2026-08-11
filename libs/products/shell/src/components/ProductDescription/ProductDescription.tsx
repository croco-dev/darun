'use client';

import { bind } from '@darun/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';

import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  if (!description) {
    return null;
  }

  const sanitizedDescription = DOMPurify.sanitize(description);

  return (
    <div className="prose prose-sm max-w-none text-dark-700 [&_blockquote]:my-6 [&_blockquote]:rounded-r-card [&_blockquote]:border-l-4 [&_blockquote]:border-dark-900 [&_blockquote]:bg-surface-100 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-dark-900 [&_blockquote]:not-italic [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-150 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-dark-900 [&_p]:my-2 [&_p.blank]:hidden [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
      <div
        dangerouslySetInnerHTML={{
          __html: sanitizedDescription,
        }}
      />
    </div>
  );
});
