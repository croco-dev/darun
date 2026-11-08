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
type EditableSpan = Span & { format?: 'html' | 'markdown'; unquoted?: boolean; text?: string };
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
          const valueStart = equals + 1 + (raw.slice(equals + 1).match(/^[\t\n\f\r ]*/)?.[0].length ?? 0);
          const quoted = raw[valueStart] === '"' || raw[valueStart] === "'";
          const start = offset + attribute.startOffset + valueStart + (quoted ? 1 : 0);
          const end = offset + attribute.endOffset - (quoted ? 1 : 0);
          const text = 'attrs' in node ? node.attrs.find(attr => attr.name === 'alt')?.value : undefined;
          if (text?.trim()) spans.push({ start, end, format: 'html', unquoted: !quoted, text });
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
          if (typeof node['alt'] === 'string' && node['alt'].trim())
            spans.push({ start: start + 2, end: index, format: 'markdown', text: node['alt'] });
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
    encodedText += (span.text ?? source.slice(span.start, span.end)).replace(immutable, value => protect(value));
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

function escapeAlternativeText(text: string, format: 'html' | 'markdown'): string {
  // Both document forms ultimately reach an HTML renderer. Markdown backslashes alone do not protect tags there.
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (format === 'html')
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
  return text
    .replace(/[\\`*_[\]{}()#+.!-]/g, '\\$&')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;');
}

export function decodeHtml(encodedText: string, encoded: HtmlCodecResult): string {
  const { placeholders, tokenOrder, altSlots } = encoded;
  const rejectHtml = (text: string) => {
    if (/<\/?[A-Za-z!][^>]*>/.test(text)) throw new Error('Translation introduced HTML structure');
  };
  if (!placeholders.size) {
    rejectHtml(encodedText);
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
  let alternativeText = '';
  let cursor = 0;
  let decoded = '';
  let outsideAlternativeText = '';
  for (const match of encodedText.matchAll(new RegExp(`⟦HTML_${nonce}_[^⟧]*⟧`, 'g'))) {
    const text = encodedText.slice(cursor, match.index);
    if (format) alternativeText += text;
    else {
      decoded += text;
      outsideAlternativeText += text;
    }
    const token = match[0];
    outsideAlternativeText += token;
    if (boundaries.has(token)) {
      if (format) {
        if (!alternativeText.trim()) throw new Error('Translation omitted image alternative text');
        decoded += escapeAlternativeText(alternativeText, format);
        alternativeText = '';
      }
      format = boundaries.get(token)!;
      decoded += placeholders.get(token)!;
    } else if (format) alternativeText += placeholders.get(token)!;
    else decoded += placeholders.get(token)!;
    cursor = match.index! + token.length;
  }
  const tail = encodedText.slice(cursor);
  rejectHtml(outsideAlternativeText + tail);
  return decoded + tail;
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
  const documentStructure = (document: string) => {
    document = explicitLinkReferences(document);
    // Physical newlines in an HTML attribute can change CommonMark block classification.
    // Compare both documents with only editable alt values masked, preserving all other syntax.
    let cursor = 0;
    let masked = '';
    for (const span of editableSpans(document)) {
      if (span.format !== 'html') continue;
      masked += document.slice(cursor, span.start) + (span.unquoted ? '"alt"' : 'alt');
      cursor = span.end;
    }
    return structure(markdown.parse(masked + document.slice(cursor)) as MarkdownNode);
  };
  if (JSON.stringify(documentStructure(source)) !== JSON.stringify(documentStructure(translated))) {
    throw new Error('Translation changed Markdown structure');
  }
}
