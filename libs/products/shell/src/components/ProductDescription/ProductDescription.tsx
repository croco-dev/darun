'use client';

import { bind } from '@darun/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';
import { FileText } from '@darun/ui';
import { useTranslations } from 'next-intl';

import { useProductDescription } from './useProductDescription';

const DESCRIPTION_STYLES =
  `max-w-none text-dark-700 break-keep leading-relaxed [&>*:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_p:first-child]:mt-0 [&_a]:font-semibold [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-dark-600 [&_blockquote]:my-5 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-brown-500 [&_blockquote]:bg-surface-100/80 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-dark-800 [&_blockquote_p]:my-1 [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_code]:rounded-md [&_code]:border [&_code]:border-dark-150 [&_code]:bg-surface-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:font-medium [&_code]:text-dark-800 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-dark-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-dark-900 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-150 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:my-1 [&_p]:my-2.5 [&_p]:leading-relaxed [&_p.blank]:hidden [&_strong]:font-semibold [&_strong]:text-dark-900 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-dark-150 [&_th]:bg-surface-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs sm:[&_th]:text-sm [&_th]:font-semibold [&_th]:text-dark-900 [&_td]:border [&_td]:border-dark-150 [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs sm:[&_td]:text-sm [&_td]:text-dark-700 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1`;

type Section = {
  type: 'default' | 'recommend' | 'regret';
  html: string;
};

const RECOMMEND_KEYWORDS = ['추천한다면'];
const REGRET_KEYWORDS = ['아쉽다면'];

function classifySection(headingText: string): Section['type'] {
  const trimmed = headingText.trim();
  if (RECOMMEND_KEYWORDS.some(kw => trimmed.startsWith(kw))) return 'recommend';
  if (REGRET_KEYWORDS.some(kw => trimmed.startsWith(kw))) return 'regret';
  return 'default';
}

const HEADING_RE = /^<(?:h[23])[^>]*>.*<\/(?:h[23])>$/i;

function splitIntoSections(html: string): Section[] {
  const fragments = html.split(/(<(?:h[23])[^>]*>.*?<\/(?:h[23])>)/i);
  if (fragments.length <= 1) return [{ type: 'default', html }];

  const sections: Section[] = [];
  let currentType: Section['type'] = 'default';
  let currentHtml = '';

  for (const fragment of fragments) {
    if (!fragment) continue;

    if (HEADING_RE.test(fragment)) {
      if (currentHtml) sections.push({ type: currentType, html: currentHtml });
      currentType = classifySection(fragment.replace(/<[^>]+>/g, ''));
      currentHtml = fragment;
    } else {
      currentHtml += fragment;
    }
  }

  if (currentHtml) sections.push({ type: currentType, html: currentHtml });

  return sections;
}

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  const t = useTranslations('ProductDetail');

  if (!description) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150/80 bg-gradient-to-br from-surface-50 to-surface-100 text-dark-500 shadow-2xs">
          <FileText size={18} className="stroke-[2]" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-keep">{t('description.empty')}</p>
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(description);
  const sections = splitIntoSections(sanitizedDescription);

  const cardStyles: Record<Section['type'], string> = {
    default: '',
    recommend:
      'my-6 rounded-2xl border border-leaf-200/90 bg-gradient-to-br from-leaf-50/90 via-leaf-50/60 to-leaf-50/30 p-5 sm:p-6 shadow-xs first:mt-0 last:mb-0 [&_h2]:mt-0 [&_h2]:mb-2.5 [&_h2]:text-leaf-900 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:mb-2 [&_h3]:text-leaf-900 [&_p]:text-leaf-900/85 [&_p:last-child]:mb-0 [&_ul]:text-leaf-900/85',
    regret:
      'my-6 rounded-2xl border border-yellow-200/90 bg-gradient-to-br from-yellow-50/90 via-yellow-50/60 to-yellow-50/30 p-5 sm:p-6 shadow-xs first:mt-0 last:mb-0 [&_h2]:mt-0 [&_h2]:mb-2.5 [&_h2]:text-yellow-900 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:mb-2 [&_h3]:text-yellow-900 [&_p]:text-yellow-900/85 [&_p:last-child]:mb-0 [&_ul]:text-yellow-900/85',
  };

  return (
    <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
      <div className={DESCRIPTION_STYLES}>
        {sections.map((section, i) => {
          if (section.type === 'default') {
            return (
              <div key={i} dangerouslySetInnerHTML={{ __html: section.html }} />
            );
          }
          return (
            <div key={i} className={cardStyles[section.type]}>
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </div>
          );
        })}
      </div>
    </div>
  );
});
