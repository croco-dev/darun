import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { randomBytes } from 'node:crypto';

export interface HtmlCodecResult {
  encodedText: string;
  placeholders: Map<string, string>;
  tokenOrder: string[];
  altSlots: Array<{ start: string; end: string; format: 'html' | 'markdown' }>;
}
interface MarkdownNode {
  type: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  [key: string]: unknown;
}
type Span = { start: number; end: number };
type EditableSpan = Span & { format?: 'html' | 'markdown'; unquoted?: boolean };
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
      ranges.push({
        start: node.sourceCodeLocation.startOffset,
        end: node.sourceCodeLocation.endOffset,
      });
    } else if ('childNodes' in node) for (const child of node.childNodes) walk(child);
  };
  walk(parseFragment(fragments.join(''), { sourceCodeLocationInfo: true }));
  return ranges;
}

/** Implicit link/image labels also name their definition. Freeze that name before translating the label. */
function explicitLinkReferences(source: string): string {
  const edits: Array<Span & { text: string }> = [];
  const document = markdown.parse(source) as MarkdownNode;
  const protectedRanges = protectedHtmlRanges(source, document);
  const walk = (node: MarkdownNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      (node.type === 'linkReference' || node.type === 'imageReference') &&
      (node.referenceType === 'collapsed' || node.referenceType === 'shortcut') &&
      start !== undefined &&
      end !== undefined
    ) {
      if (protectedRanges.some(range => start >= range.start && end <= range.end)) return;
      const collapsed = node.referenceType === 'collapsed';
      const label = source.slice(start + (node.type === 'imageReference' ? 2 : 1), end - (collapsed ? 3 : 1));
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

function editableSpans(source: string): EditableSpan[] {
  const spans: EditableSpan[] = [];
  const document = markdown.parse(source) as MarkdownNode;
  const protectedRanges = protectedHtmlRanges(source, document);
  const htmlText = (fragment: string, offset: number) => {
    const walk = (node: DefaultTreeAdapterMap['node'], protectedParent = false) => {
      const location = node.sourceCodeLocation;
      const tag = 'tagName' in node ? node.tagName : '';
      const protectedNode = protectedParent || ['script', 'style', 'pre', 'code'].includes(tag);
      if (node.nodeName === '#text' && location && !protectedNode) {
        spans.push({
          start: offset + location.startOffset,
          end: offset + location.endOffset,
        });
      }
      const attribute =
        'tagName' in node && node.tagName === 'img' ? node.sourceCodeLocation?.attrs?.['alt'] : undefined;
      if (attribute && !protectedNode) {
        const raw = fragment.slice(attribute.startOffset, attribute.endOffset);
        const equals = raw.indexOf('=');
        if (equals !== -1) {
          const valueStart = equals + 1 + (raw.slice(equals + 1).match(/^\s*/)?.[0].length ?? 0);
          const quoted = raw[valueStart] === '"' || raw[valueStart] === "'";
          const start = offset + attribute.startOffset + valueStart + (quoted ? 1 : 0);
          const end = offset + attribute.endOffset - (quoted ? 1 : 0);
          if (source.slice(start, end).trim()) spans.push({ start, end, format: 'html', unquoted: !quoted });
        }
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
    else if ((node.type === 'image' || node.type === 'imageReference') && start !== undefined && end !== undefined) {
      // Parser-selected image nodes own the label; escaped/nested brackets stay inside that label.
      let depth = 1;
      for (let index = start + 2; index < end; index++) {
        if (source[index] === '\\') index++;
        else if (source[index] === '[') depth++;
        else if (source[index] === ']' && --depth === 0) {
          if (source.slice(start + 2, index).trim()) spans.push({ start: start + 2, end: index, format: 'markdown' });
          break;
        }
      }
    } else if (node.type === 'html' && start !== undefined && end !== undefined)
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
  const altSlots: HtmlCodecResult['altSlots'] = [];
  const protect = (value: string, boundary = false) => {
    if (!value && !boundary) return '';
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
    const start = span.format ? protect(span.unquoted ? '"' : '', true) : '';
    encodedText += start;
    encodedText += source.slice(span.start, span.end).replace(immutable, value => protect(value));
    if (span.format) {
      const end = protect(span.unquoted ? '"' : '', true);
      encodedText += end;
      altSlots.push({ start, end, format: span.format });
    }
    cursor = span.end;
  }
  encodedText += protect(source.slice(cursor));
  return { encodedText, placeholders, tokenOrder, altSlots };
}

function escapeAlternativeText(text: string, format: 'html' | 'markdown' | null): string {
  if (!format) return text;
  text = text.replace(/&/g, '&amp;');
  if (format === 'html')
    return text
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r/g, '&#13;')
      .replace(/\n/g, '&#10;');
  return text
    .replace(/[\\`*_[\]{}()#+.!<>-]/g, '\\$&')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;');
}

export function decodeHtml(encodedText: string, encoded: HtmlCodecResult): string {
  const { placeholders, tokenOrder, altSlots } = encoded;
  if (/<\/?[A-Za-z!][^>]*>/.test(encodedText)) throw new Error('Translation introduced HTML structure');
  if (!placeholders.size) {
    if (/⟦HTML_[^⟧]*⟧/.test(encodedText)) throw new Error('Translation introduced document placeholder');
    return encodedText;
  }
  const nonce = [...placeholders.keys()][0]!.match(/^⟦HTML_([a-f\d]+)_/)?.[1];
  if (!nonce) throw new Error('Invalid document placeholder namespace');
  const tokens = encodedText.match(/⟦HTML_[^⟧]*⟧/g) ?? [];
  const expected = tokenOrder;
  if (tokens.length !== expected.length) throw new Error('HTML placeholder count mismatch');
  if (tokens.some((token, index) => token !== expected[index])) throw new Error('HTML placeholder order mismatch');
  const boundaries = new Map<string, 'html' | 'markdown' | null>();
  for (const slot of altSlots) {
    boundaries.set(slot.start, slot.format);
    boundaries.set(slot.end, null);
  }
  let format: 'html' | 'markdown' | null = null;
  let altStart = 0;
  let cursor = 0;
  let decoded = '';
  for (const match of encodedText.matchAll(new RegExp(`⟦HTML_${nonce}_[^⟧]*⟧`, 'g'))) {
    decoded += escapeAlternativeText(encodedText.slice(cursor, match.index), format);
    const token = match[0];
    // Immutable source bytes (including entities/escapes) bypass escaping; only model text is escaped.
    if (boundaries.has(token)) {
      if (format && !decoded.slice(altStart).trim()) throw new Error('Translation omitted image alternative text');
      format = boundaries.get(token)!;
      altStart = decoded.length + placeholders.get(token)!.length;
    }
    decoded += placeholders.get(token)!;
    cursor = match.index! + token.length;
  }
  return decoded + escapeAlternativeText(encodedText.slice(cursor), format);
}

/** Compare parser structure, not translated words, so newly introduced Markdown cannot alter lists/quotes/links. */
export function assertDocumentStructure(source: string, translated: string): void {
  const htmlStructure = (node: DefaultTreeAdapterMap['node'], protectedParent = false): unknown => {
    const tag = 'tagName' in node ? node.tagName : '';
    const protectedNode = protectedParent || ['script', 'style', 'pre', 'code'].includes(tag);
    return {
      node: node.nodeName,
      ...('attrs' in node
        ? {
            attrs: node.attrs.map(attr => (tag === 'img' && attr.name === 'alt' ? { ...attr, value: '' } : attr)),
          }
        : {}),
      ...(protectedNode && 'value' in node ? { value: node.value } : {}),
      ...('data' in node ? { data: node.data } : {}),
      ...('childNodes' in node
        ? {
            children: node.childNodes.map(child => htmlStructure(child, protectedNode)),
          }
        : {}),
    };
  };
  const structure = (node: MarkdownNode): unknown => {
    const { position: _position, value: _value, children, ...properties } = node;
    if (node.type === 'image' || node.type === 'imageReference') delete properties['alt'];
    if (node.type === 'html') properties['html'] = htmlStructure(parseFragment(node['value'] as string));
    return {
      ...properties,
      ...(children ? { children: children.map(structure) } : {}),
    };
  };
  if (
    JSON.stringify(structure(markdown.parse(explicitLinkReferences(source)) as MarkdownNode)) !==
    JSON.stringify(structure(markdown.parse(explicitLinkReferences(translated)) as MarkdownNode))
  ) {
    throw new Error('Translation changed Markdown structure');
  }
}
