export type Representation = 'html' | 'markdown' | 'not-acceptable';

type MediaRange = {
  type: string;
  subtype: string;
  q: number;
  order: number;
};

function parseAcceptHeader(header: string): MediaRange[] {
  const ranges: MediaRange[] = [];
  const entries = header.split(',');

  for (let order = 0; order < entries.length; order++) {
    const raw = entries[order]?.trim();
    if (!raw) continue;

    const [mediaType, ...params] = raw.split(';').map(s => s.trim());
    if (!mediaType) continue;

    const parts = mediaType.toLowerCase().split('/');
    if (parts.length !== 2) continue;
    const [type, subtype] = parts;
    if (!type || !subtype) continue;

    let q = 1.0;
    for (const param of params) {
      const [key, val] = param.split('=').map(s => s.trim().toLowerCase());
      if (key === 'q' && val !== undefined) {
        const parsedQ = parseFloat(val);
        if (!Number.isNaN(parsedQ)) {
          q = Math.max(0, Math.min(1, parsedQ));
        } else {
          q = 0;
        }
      }
    }

    ranges.push({ type, subtype, q, order });
  }

  return ranges;
}

function matchQuality(
  targetType: string,
  targetSubtype: string,
  ranges: MediaRange[]
): { q: number; specificity: number; order: number } | null {
  let bestMatch: { q: number; specificity: number; order: number } | null = null;

  for (const range of ranges) {
    let specificity = -1;

    if (range.type === targetType && range.subtype === targetSubtype) {
      specificity = 2; // exact match
    } else if (range.type === targetType && range.subtype === '*') {
      specificity = 1; // type/* match
    } else if (range.type === '*' && range.subtype === '*') {
      specificity = 0; // */* match
    }

    if (specificity >= 0) {
      if (!bestMatch || specificity > bestMatch.specificity) {
        bestMatch = { q: range.q, specificity, order: range.order };
      } else if (specificity === bestMatch.specificity && range.order < bestMatch.order) {
        bestMatch = { q: range.q, specificity, order: range.order };
      }
    }
  }

  return bestMatch;
}

export function negotiateRepresentation(acceptHeader: string | null | undefined): Representation {
  if (acceptHeader === null || acceptHeader === undefined || !acceptHeader.trim()) {
    return 'html';
  }

  const ranges = parseAcceptHeader(acceptHeader);
  if (ranges.length === 0) {
    return 'html';
  }

  const htmlMatch = matchQuality('text', 'html', ranges);
  const markdownMatch = matchQuality('text', 'markdown', ranges);

  const htmlQ = htmlMatch ? htmlMatch.q : 0;
  const markdownQ = markdownMatch ? markdownMatch.q : 0;

  if (htmlQ === 0 && markdownQ === 0) {
    return 'not-acceptable';
  }

  if (markdownQ > htmlQ) {
    return 'markdown';
  }

  if (htmlQ > markdownQ) {
    return 'html';
  }

  // Equal quality > 0: tiebreak
  // 1. If one has higher specificity than the other
  if (htmlMatch && markdownMatch && htmlMatch.specificity !== markdownMatch.specificity) {
    return htmlMatch.specificity > markdownMatch.specificity ? 'html' : 'markdown';
  }

  // 2. If both have same specificity, check client header order
  if (htmlMatch && markdownMatch && htmlMatch.order !== markdownMatch.order) {
    return htmlMatch.order < markdownMatch.order ? 'html' : 'markdown';
  }

  // 3. Default to html
  return 'html';
}

export function appendVary(existingHeader: string | null | undefined, token: string): string {
  if (!existingHeader || !existingHeader.trim()) {
    return token;
  }
  const parts = existingHeader.split(',').map(p => p.trim());
  const tokenLower = token.toLowerCase();
  if (parts.some(p => p.toLowerCase() === tokenLower)) {
    return existingHeader;
  }
  return `${existingHeader}, ${token}`;
}
