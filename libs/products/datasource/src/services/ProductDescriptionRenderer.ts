import { safeReaderFacingUrl, type EvidenceBackedText, type ProductDescriptionDocument } from '@darun/products-domain';

export const PRODUCT_DESCRIPTION_RENDERER_VERSION = 'v3';

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
    fragments.push(renderRichBlock(doc.intro, 'p'));
  }

  // 2. Sections
  if (Array.isArray(doc.sections)) {
    for (const section of doc.sections) {
      if (section.title) {
        fragments.push(`<h2>${escapeHtml(section.title)}</h2>`);
      }
      if (Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) {
          if (p.text) {
            fragments.push(renderRichBlock(p, 'p'));
          }
        }
      }
    }
  }

  // 3. Recommended if
  if (Array.isArray(doc.recommendedIf) && doc.recommendedIf.length > 0) {
    fragments.push('<h2>이런 경우에 추천합니다</h2>');
    fragments.push('<ul>');
    for (const item of doc.recommendedIf) {
      if (item.text) {
        fragments.push(`<li>${renderInlineContent(item)}${renderBulletList(item)}</li>`);
      }
    }
    fragments.push('</ul>');
  }

  // 4. Closing
  if (doc.closing?.text) {
    fragments.push(renderRichBlock(doc.closing, 'p'));
  }

  // 5. Byline
  const byline = formatEditorByline(date);
  fragments.push(`<p><em>${escapeHtml(byline)}</em></p>`);

  return fragments.join('\n');
}

function renderRichBlock(block: EvidenceBackedText, tag: 'p'): string {
  const inline = renderInlineContent(block);
  const body = block.quote ? `<blockquote><${tag}>${inline}</${tag}></blockquote>` : `<${tag}>${inline}</${tag}>`;
  const bulletList = renderBulletList(block);
  return bulletList ? `${body}\n${bulletList}` : body;
}

function renderBulletList(block: EvidenceBackedText): string {
  if (!block.bullets?.length) return '';
  const bullets = block.bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('');
  return `<ul>${bullets}</ul>`;
}

function renderInlineContent(block: EvidenceBackedText): string {
  const escapedText = escapeHtml(block.text);
  if (!block.link) {
    return escapedText;
  }
  const safeUrl = safeReaderFacingUrl(block.link.url);
  if (!safeUrl) {
    return escapedText;
  }
  const label = escapeHtml(block.link.label);
  return `${escapedText} <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
