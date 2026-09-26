import type { ProductDescriptionDocument } from '@darun/products-domain';

export const PRODUCT_DESCRIPTION_RENDERER_VERSION = 'v1';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatEditorByline(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value ?? String(date.getFullYear());
  const month = parts.find(p => p.type === 'month')?.value ?? String(date.getMonth() + 1);

  return `${year}년 ${month}월 - Editor. DAO`;
}

export function renderProductDescriptionDocument(doc: ProductDescriptionDocument, date?: Date): string {
  const fragments: string[] = [];

  // 1. Intro
  if (doc.intro?.text) {
    fragments.push(`<p>${escapeHtml(doc.intro.text)}</p>`);
  }

  // 2. Sections
  if (Array.isArray(doc.sections)) {
    for (const section of doc.sections) {
      if (section.title) {
        fragments.push(`<h3>${escapeHtml(section.title)}</h3>`);
      }
      if (Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) {
          if (p.text) {
            fragments.push(`<p>${escapeHtml(p.text)}</p>`);
          }
        }
      }
    }
  }

  // 3. Recommended if
  if (Array.isArray(doc.recommendedIf) && doc.recommendedIf.length > 0) {
    fragments.push('<h3>추천한다면 -</h3>');
    fragments.push('<ul>');
    for (const item of doc.recommendedIf) {
      if (item.text) {
        fragments.push(`<li>${escapeHtml(item.text)}</li>`);
      }
    }
    fragments.push('</ul>');
  }

  // 4. Closing
  if (doc.closing?.text) {
    fragments.push(`<p>${escapeHtml(doc.closing.text)}</p>`);
  }

  // 5. Byline
  const byline = formatEditorByline(date);
  fragments.push(`<p><em>${escapeHtml(byline)}</em></p>`);

  return fragments.join('\n');
}
