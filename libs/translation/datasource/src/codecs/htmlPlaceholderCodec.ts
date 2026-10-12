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

  const literalCollision = (() => {
    PLACEHOLDER_REGEX.lastIndex = 0;
    const found = PLACEHOLDER_REGEX.test(html);
    PLACEHOLDER_REGEX.lastIndex = 0;
    return found;
  })();
  if (literalCollision) {
    throw new Error('HTML source contains a literal placeholder-shaped token and cannot be encoded safely.');
  }

  const encodedText = html.replace(HTML_TAG_REGEX, tag => {
    const token = `⟦HTML_${String(index).padStart(4, '0')}⟧`;
    placeholders.set(token, tag);
    tokenOrder.push(token);
    index++;
    return token;
  });

  return { encodedText, placeholders, tokenOrder };
}

export function decodeHtml(
  encodedText: string,
  placeholders: Map<string, string>,
  tokenOrder?: string[]
): string {
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

  // 같은 토큰 집합이라도 순서가 바뀌면 태그 위치가 뒤바뀌어
  // 닫힘 순서가 깨진 손상 출력이 되므로 순서 일치를 강제한다.
  const expectedOrder = tokenOrder ?? [...placeholders.keys()];
  if (expectedOrder.length === foundTokens.length) {
    const reordered = expectedOrder.some((token, index) => foundTokens[index] !== token);
    if (reordered) {
      throw new Error('HTML placeholder order mismatch: translated output reordered tag tokens.');
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
