import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { randomBytes } from 'node:crypto';

export interface HtmlCodecResult {
  encodedText: string;
  placeholders: Map<string, string>;
  tokenOrder: string[];
}
interface MarkdownNode {
  type: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  [key: string]: unknown;
}
type Span = { start: number; end: number };
const markdown = unified().use(remarkParse);

function protectedHtmlRanges(source: string, document: MarkdownNode): Span[] {
  const fragments: string[] = [];
  let cursor = 0;
  // Only Markdown HTML nodes can open/close HTML regions; escaped tags and code literals cannot.
  const collectHtml = (node: MarkdownNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (node.type === 'html' && start !== undefined && end !== undefined) {
      fragments.push(' '.repeat(start - cursor), source.slice(start, end));
      cursor = end;
    } else if (node.children) for (const child of node.children) collectHtml(child);
  };
  collectHtml(document);
  fragments.push(' '.repeat(source.length - cursor));
  const ranges: Span[] = [];
  const walk = (node: DefaultTreeAdapterMap['node']) => {
    if ('tagName' in node && ['script', 'style', 'pre', 'code'].includes(node.tagName) && node.sourceCodeLocation) {
      ranges.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset });
    } else if ('childNodes' in node) for (const child of node.childNodes) walk(child);
  };
  walk(parseFragment(fragments.join(''), { sourceCodeLocationInfo: true }));
  return ranges;
}

/** Implicit link labels also name their definition. Freeze that name separately before translating the label. */
function explicitLinkReferences(source: string): string {
  const edits: Array<Span & { text: string }> = [];
  const document = markdown.parse(source) as MarkdownNode;
  const protectedRanges = protectedHtmlRanges(source, document);
  const walk = (node: MarkdownNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      node.type === 'linkReference' &&
      (node.referenceType === 'collapsed' || node.referenceType === 'shortcut') &&
      start !== undefined &&
      end !== undefined
    ) {
      if (protectedRanges.some(range => start >= range.start && end <= range.end)) return;
      const collapsed = node.referenceType === 'collapsed';
      const label = source.slice(start + 1, end - (collapsed ? 3 : 1));
      edits.push({ start: end - (collapsed ? 2 : 0), end, text: `[${label}]` });
    } else if (node.children) for (const child of node.children) walk(child);
  };
  walk(document);
  let cursor = 0;
  let explicit = '';
  for (const edit of edits) {
    explicit += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return explicit + source.slice(cursor);
}

function editableSpans(source: string): Span[] {
  const spans: Span[] = [];
  const document = markdown.parse(source) as MarkdownNode;
  const protectedRanges = protectedHtmlRanges(source, document);
  const htmlText = (fragment: string, offset: number) => {
    const walk = (node: DefaultTreeAdapterMap['node'], protectedParent = false) => {
      const location = node.sourceCodeLocation;
      const tag = 'tagName' in node ? node.tagName : '';
      const protectedNode = protectedParent || ['script', 'style', 'pre', 'code'].includes(tag);
      if (node.nodeName === '#text' && location && !protectedNode) {
        spans.push({ start: offset + location.startOffset, end: offset + location.endOffset });
      }
      if ('childNodes' in node) for (const child of node.childNodes) walk(child, protectedNode);
    };
    walk(parseFragment(fragment, { sourceCodeLocationInfo: true }));
  };
  const walk = (node: MarkdownNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    // Inline HTML tags and their text are separate Markdown nodes; the whole HTML range owns both.
    if (
      start !== undefined &&
      end !== undefined &&
      protectedRanges.some(range => start >= range.start && end <= range.end)
    )
      return;
    if (node.type === 'text' && start !== undefined && end !== undefined) spans.push({ start, end });
    else if (node.type === 'html' && start !== undefined && end !== undefined)
      htmlText(source.slice(start, end), start);
    else if (node.children) for (const child of node.children) walk(child);
  };
  walk(document);
  return spans.sort((a, b) => a.start - b.start);
}

export function encodeHtml(source: string): HtmlCodecResult {
  source = explicitLinkReferences(source);
  let nonce: string;
  do {
    nonce = randomBytes(8).toString('hex');
  } while (source.includes(`⟦HTML_${nonce}_`));
  const placeholders = new Map<string, string>();
  const tokenOrder: string[] = [];
  const protect = (value: string) => {
    if (!value) return '';
    const token = `⟦HTML_${nonce}_${tokenOrder.length}⟧`;
    placeholders.set(token, value);
    tokenOrder.push(token);
    return token;
  };
  // Syntax comes from parser offsets, not a tag regex (which fails on quoted '>').
  // Entities, literal token-shaped text, URLs, existing Latin names/codes and numbers are immutable.
  const immutable =
    /⟦[^⟧]*⟧|&(?:#[xX][\da-fA-F]+|#\d+|[a-zA-Z][\da-zA-Z]+);|https?:\/\/[^\s<>]+|[A-Za-z][A-Za-z\d]*(?:[._/+:-][A-Za-z\d]+)*|\d+(?:[.,:/%-]\d+)*%?|\r?\n[ \t]*|\\[\s\S]/g;
  let cursor = 0;
  let encodedText = '';
  for (const span of editableSpans(source)) {
    if (span.start < cursor) continue;
    encodedText += protect(source.slice(cursor, span.start));
    encodedText += source.slice(span.start, span.end).replace(immutable, protect);
    cursor = span.end;
  }
  encodedText += protect(source.slice(cursor));
  return { encodedText, placeholders, tokenOrder };
}

export function decodeHtml(encodedText: string, placeholders: Map<string, string>, tokenOrder?: string[]): string {
  if (/<\/?[A-Za-z!][^>]*>/.test(encodedText)) throw new Error('Translation introduced HTML structure');
  if (!placeholders.size) {
    if (/⟦HTML_[^⟧]*⟧/.test(encodedText)) throw new Error('Translation introduced document placeholder');
    return encodedText;
  }
  const nonce = [...placeholders.keys()][0]!.match(/^⟦HTML_([a-f\d]+)_/)?.[1];
  if (!nonce) throw new Error('Invalid document placeholder namespace');
  const tokens = encodedText.match(/⟦HTML_[^⟧]*⟧/g) ?? [];
  const expected = tokenOrder ?? [...placeholders.keys()];
  if (tokens.length !== expected.length) throw new Error('HTML placeholder count mismatch');
  if (tokens.some((token, index) => token !== expected[index])) throw new Error('HTML placeholder order mismatch');
  return encodedText.replace(new RegExp(`⟦HTML_${nonce}_[^⟧]*⟧`, 'g'), token => placeholders.get(token)!);
}

/** Compare parser structure, not translated words, so newly introduced Markdown cannot alter lists/quotes/links. */
export function assertDocumentStructure(source: string, translated: string): void {
  const structure = (node: MarkdownNode): unknown => {
    const { position: _position, value: _value, children, ...properties } = node;
    return { ...properties, ...(children ? { children: children.map(structure) } : {}) };
  };
  if (
    JSON.stringify(structure(markdown.parse(explicitLinkReferences(source)) as MarkdownNode)) !==
    JSON.stringify(structure(markdown.parse(explicitLinkReferences(translated)) as MarkdownNode))
  ) {
    throw new Error('Translation changed Markdown structure');
  }
}
