'use client';

import { bind } from '@darun/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useProductDescription } from './useProductDescription';

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  const t = useTranslations('ProductDetail');

  if (!description) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 py-4 text-center sm:min-h-32">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-150/80 bg-surface-100 text-dark-400 shadow-2xs">
          <FileText size={18} className="stroke-[2]" />
        </div>
        <p className="text-sm font-medium text-dark-500 break-keep">{t('description.empty')}</p>
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(description);

  return (
    <div className="prose prose-sm max-w-none text-dark-700 break-keep leading-relaxed [&_a]:font-semibold [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-dark-600 [&_blockquote]:my-6 [&_blockquote]:rounded-r-card [&_blockquote]:border-l-4 [&_blockquote]:border-dark-900 [&_blockquote]:bg-surface-100 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-dark-900 [&_blockquote]:not-italic [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-150 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-dark-900 [&_p]:my-2 [&_p]:leading-relaxed [&_p.blank]:hidden [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5">
      <div
        dangerouslySetInnerHTML={{
          __html: sanitizedDescription,
        }}
      />
    </div>
  );
});
