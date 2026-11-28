export const MAX_PRODUCT_USAGE_CONDITIONS = 5;
export const MAX_PRODUCT_USAGE_STATEMENT_LENGTH = 300;
export const MAX_PRODUCT_USAGE_EXCERPT_LENGTH = 1000;
export const MAX_PRODUCT_USAGE_SOURCE_URL_LENGTH = 2048;

export const USAGE_CONDITIONS_HTML_START = '\n<!--darun:product-usage-conditions:v1-->\n';
export const USAGE_CONDITIONS_HTML_END = '\n<!--/darun:product-usage-conditions:v1-->';

export function splitProductUsageConditions(html: string) {
  const start = html.lastIndexOf(USAGE_CONDITIONS_HTML_START);
  if (start < 0 || !html.endsWith(USAGE_CONDITIONS_HTML_END)) {
    return { body: html, block: '' };
  }
  return { body: html.slice(0, start), block: html.slice(start) };
}
