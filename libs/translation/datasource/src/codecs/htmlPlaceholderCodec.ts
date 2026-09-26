export interface HtmlCodecResult {
  encodedText: string;
  placeholders: Map<string, string>;
  tokenOrder: string[];
}

const HTML_TAG_REGEX = /<\/?[a-zA-Z][^<>]*>/g;
const PLACEHOLDER_REGEX = /⟦HTML_(\d{4})⟧/g;

export function encodeHtml(html: string): HtmlCodecResult {
  const placeholders = new Map<string, string>();
  const tokenOrder: string[] = [];
  let index = 0;

  const encodedText = html.replace(HTML_TAG_REGEX, tag => {
    const token = `⟦HTML_${String(index).padStart(4, '0')}⟧`;
    placeholders.set(token, tag);
    tokenOrder.push(token);
    index++;
    return token;
  });

  return { encodedText, placeholders, tokenOrder };
}

export function decodeHtml(encodedText: string, placeholders: Map<string, string>): string {
  if (placeholders.size === 0) {
    return encodedText;
  }

  const foundTokens = encodedText.match(PLACEHOLDER_REGEX) ?? [];
  const foundSet = new Set(foundTokens);

  if (foundTokens.length !== placeholders.size) {
    throw new Error(
      `HTML placeholder count mismatch: expected ${placeholders.size} tags, found ${foundTokens.length} in translated output.`
    );
  }

  for (const token of placeholders.keys()) {
    if (!foundSet.has(token)) {
      throw new Error(`HTML placeholder missing: ${token} was lost during translation.`);
    }
  }

  for (const token of foundTokens) {
    if (!placeholders.has(token)) {
      throw new Error(`Unexpected HTML placeholder found: ${token}`);
    }
  }

  return encodedText.replace(PLACEHOLDER_REGEX, token => {
    const originalTag = placeholders.get(token);
    if (!originalTag) {
      throw new Error(`Unrecognized placeholder token: ${token}`);
    }
    return originalTag;
  });
}
