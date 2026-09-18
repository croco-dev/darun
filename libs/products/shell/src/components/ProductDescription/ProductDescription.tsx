'use client';

import { bind } from '@darun/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';
import { FileText } from '@darun/ui';
import { useTranslations } from 'next-intl';

import { useProductDescription } from './useProductDescription';

const DESCRIPTION_STYLES =
  `max-w-none text-dark-700 break-keep leading-relaxed [&_a]:font-semibold [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-dark-600 [&_blockquote]:my-6 [&_blockquote]:rounded-r-card [&_blockquote]:border-l-4 [&_blockquote]:border-dark-900 [&_blockquote]:bg-surface-100 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-dark-900 [&_blockquote]:not-italic [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_code]:rounded [&_code]:bg-surface-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-medium [&_code]:text-dark-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-dark-900 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-dark-900 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-150 [&_p]:my-2 [&_p]:leading-relaxed [&_p.blank]:hidden [&_strong]:font-semibold [&_strong]:text-dark-900 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5`;

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
      <div className="flex flex-col items-center justify-center gap-2 rounded-card-lg border border-dashed border-dark-200 bg-surface-50/50 px-6 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-150/80 bg-surface-100 text-dark-400 shadow-2xs">
          <FileText size={18} className="stroke-[2]" />
        </div>
        <p className="text-sm font-medium text-dark-500 break-keep">{t('description.empty')}</p>
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(description);
  const sections = splitIntoSections(sanitizedDescription);

  const cardStyles: Record<Section['type'], string> = {
    default: '',
    recommend: 'rounded-card-lg border border-leaf-200 bg-leaf-50 p-5 shadow-card',
    regret: 'rounded-card-lg border border-yellow-200 bg-yellow-50 p-5 shadow-card',
  };

  return (
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
  );
});
