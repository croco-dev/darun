'use client';

import { FileText } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import DOMPurify from 'isomorphic-dompurify';
import { useTranslations } from 'next-intl';

import { useProductDescription } from './useProductDescription';

const DESCRIPTION_STYLES = `max-w-none text-dark-700 break-words [word-break:keep-all] leading-relaxed [&>*:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_p:first-child]:mt-0 [&_a]:font-semibold [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-dark-600 [&_blockquote]:my-5 [&_blockquote]:rounded-r-xl [&_blockquote]:border-l-4 [&_blockquote]:border-brown-500 [&_blockquote]:bg-surface-100/80 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-dark-800 [&_blockquote_p]:my-1 [&_br]:block [&_br]:content-[''] [&_br]:mb-1 [&_code]:rounded-md [&_code]:border [&_code]:border-dark-150 [&_code]:bg-surface-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono [&_code]:font-medium [&_code]:text-dark-800 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-dark-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-dark-900 [&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-dark-150 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:my-1 [&_p]:my-2.5 [&_p]:leading-relaxed [&_p]:break-words [&_p.blank]:hidden [&_strong]:font-semibold [&_strong]:text-dark-900 [&_table]:my-5 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_th]:border [&_th]:border-dark-150 [&_th]:bg-surface-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs sm:[&_th]:text-sm [&_th]:font-semibold [&_th]:text-dark-900 [&_th]:break-words [&_td]:border [&_td]:border-dark-150 [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs sm:[&_td]:text-sm [&_td]:text-dark-700 [&_td]:break-words [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_li]:break-words [&_em]:not-italic [&_em]:text-xs sm:[&_em]:text-sm [&_em]:font-medium [&_em]:text-dark-500 [&_em]:tracking-tight`;

type Section = {
  type: 'default' | 'recommend' | 'regret';
  html: string;
};

const RECOMMEND_KEYWORDS = [
  '추천한다면',
  '장점',
  '추천 대상',
  '이런 분께 추천',
  '이런 분에게 추천',
  'Recommended if',
  'Who should use',
  'Best for',
  'Pros',
];
const REGRET_KEYWORDS = [
  '아쉽다면',
  '단점',
  '아쉬운 점',
  '유의할 점',
  'Limitations',
  'Drawbacks',
  'Cons',
  'Not recommended if',
  'Things to consider',
];

function classifySection(headingText: string): Section['type'] {
  const trimmed = headingText.trim().toLowerCase();
  if (RECOMMEND_KEYWORDS.some(kw => trimmed.startsWith(kw.toLowerCase()))) return 'recommend';
  if (REGRET_KEYWORDS.some(kw => trimmed.startsWith(kw.toLowerCase()))) return 'regret';
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
      if (currentHtml.trim()) {
        sections.push({ type: currentType, html: currentHtml });
      }
      currentType = classifySection(fragment.replace(/<[^>]+>/g, ''));
      currentHtml = fragment;
    } else if (currentType === 'recommend' || currentType === 'regret') {
      const listEndMatch = fragment.match(/<\/(?:ul|ol)>/i);
      if (listEndMatch && listEndMatch.index !== undefined) {
        const listEndIndex = listEndMatch.index + listEndMatch[0].length;
        const insideContent = fragment.slice(0, listEndIndex);
        const outsideContent = fragment.slice(listEndIndex);

        currentHtml += insideContent;
        sections.push({ type: currentType, html: currentHtml });
        currentType = 'default';
        currentHtml = outsideContent;
      } else {
        const breakMatch = fragment.match(/<hr\b/i);
        if (breakMatch && breakMatch.index !== undefined) {
          const insideContent = fragment.slice(0, breakMatch.index);
          const outsideContent = fragment.slice(breakMatch.index);

          currentHtml += insideContent;
          if (currentHtml.trim()) {
            sections.push({ type: currentType, html: currentHtml });
          }
          currentType = 'default';
          currentHtml = outsideContent;
        } else {
          currentHtml += fragment;
        }
      }
    } else {
      currentHtml += fragment;
    }
  }

  if (currentHtml.trim()) {
    sections.push({ type: currentType, html: currentHtml });
  }

  return sections;
}

export const ProductDescription = bind(useProductDescription, ({ description }) => {
  const t = useTranslations('ProductDetail');

  if (!description) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-dark-200/80 bg-surface-50/50 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dark-150 bg-surface-100 text-dark-500 shadow-2xs">
          <FileText size={18} className="stroke-[2] shrink-0" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-dark-900 break-words [word-break:keep-all]">
          {t('description.empty')}
        </p>
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(description);
  const sections = splitIntoSections(sanitizedDescription);

  const cardStyles: Record<Section['type'], string> = {
    default: '',
    recommend:
      'my-5 rounded-xl border border-leaf-200/90 bg-leaf-50/40 p-4 sm:p-5 shadow-2xs first:mt-0 last:mb-0 [&_h2]:mt-0 [&_h2]:mb-2.5 [&_h2]:text-leaf-950 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:mb-2 [&_h3]:text-leaf-950 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-bold [&_p]:text-leaf-900/90 [&_p:last-child]:mb-0 [&_ul]:text-leaf-900/90 [&_li]:my-1.5',
    regret:
      'my-5 rounded-xl border border-yellow-200/90 bg-yellow-50/40 p-4 sm:p-5 shadow-2xs first:mt-0 last:mb-0 [&_h2]:mt-0 [&_h2]:mb-2.5 [&_h2]:text-yellow-900 [&_h2]:text-base sm:[&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-0 [&_h3]:mb-2 [&_h3]:text-yellow-900 [&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-bold [&_p]:text-yellow-900/90 [&_p:last-child]:mb-0 [&_ul]:text-yellow-900/90 [&_li]:my-1.5',
  };

  return (
    <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card sm:p-6 md:p-8">
      <div className={DESCRIPTION_STYLES}>
        {sections.map((section, i) => {
          const sectionKey = `desc-section-${section.type}-${i}`;
          if (section.type === 'default') {
            return <div key={sectionKey} dangerouslySetInnerHTML={{ __html: section.html }} />;
          }
          return (
            <div key={sectionKey} className={cardStyles[section.type]}>
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </div>
          );
        })}
      </div>
    </div>
  );
});
