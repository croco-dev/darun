import {
  MAX_PRODUCT_USAGE_CONDITIONS,
  MAX_PRODUCT_USAGE_EXCERPT_LENGTH,
  MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH,
  MAX_PRODUCT_USAGE_STATEMENT_LENGTH,
  USAGE_CONDITIONS_HTML_END,
  USAGE_CONDITIONS_HTML_START,
} from '../info/ProductDescriptionConditions';
import { safeReaderFacingUrl } from './ProductDescriptionEvidenceProjector';

export type ProductUsageCondition = {
  statement: string;
  sourceUrl: string;
  excerpt: string;
  checkedOn: string;
};

export type ProductUsageConditionsSnapshot = {
  version: 1;
  revision: string;
  editorId: string;
  items: ProductUsageCondition[];
};

export function normalizeProductUsageConditions(items: ProductUsageCondition[]): ProductUsageCondition[] | null {
  if (items.length > MAX_PRODUCT_USAGE_CONDITIONS) return null;
  const result: ProductUsageCondition[] = [];
  for (const { statement, sourceUrl, excerpt, checkedOn } of items) {
    if (!statement.trim() || [...statement].length > MAX_PRODUCT_USAGE_STATEMENT_LENGTH || /[\0\r\n]/.test(statement))
      return null;
    if (!excerpt.trim() || [...excerpt].length > MAX_PRODUCT_USAGE_EXCERPT_LENGTH || excerpt.includes('\0'))
      return null;
    if (sourceUrl.length > MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH || /[\x00-\x1f\x7f]/.test(sourceUrl)) return null;
    const url = safeReaderFacingUrl(sourceUrl);
    if (!url || url.length > MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH) return null;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(checkedOn)) return null;
    const date = new Date(`${checkedOn}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== checkedOn) return null;
    result.push({ statement, sourceUrl: url, excerpt, checkedOn });
  }
  return result;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderProductUsageConditions(snapshot?: ProductUsageConditionsSnapshot | null): string {
  if (!snapshot) return '';
  if (snapshot.version !== 1) throw new Error('Unsupported product usage conditions');
  if (snapshot.items.length === 0) return '';

  const list = snapshot.items.map(({ statement, sourceUrl }, index) => {
    const url = safeReaderFacingUrl(sourceUrl);
    if (!url) throw new Error('Invalid stored product usage conditions source');
    return `<li>${escapeHtml(statement)} <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">출처 ${index + 1}</a></li>`;
  });
  return `${USAGE_CONDITIONS_HTML_START}<h2>사용 조건</h2><ul>${list.join('')}</ul>${USAGE_CONDITIONS_HTML_END}`;
}
