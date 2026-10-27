import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  identifier?: string;
  ordered?: boolean;
  start?: number | null;
  depth?: number;
  lang?: string | null;
  meta?: string | null;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}
const markdown = unified().use(remarkParse);

/** Compare document meaning, effective list numbers and cell spans, ignoring presentation-only formatting. */
export function translationMeaning(html: string): string {
  const document = markdown.parse(html) as MarkdownNode;
  const htmlFragments: string[] = [];
  let htmlCursor = 0;
  const collectHtml = (node: MarkdownNode): void => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (node.type === 'html' && start !== undefined && end !== undefined) {
      htmlFragments.push(' '.repeat(start - htmlCursor), html.slice(start, end));
      htmlCursor = end;
    } else if (node.children) {
      for (const child of node.children) collectHtml(child);
    }
  };
  // Only parsed HTML can delimit literals; escaped tags and Markdown code cannot.
  collectHtml(document);
  htmlFragments.push(' '.repeat(html.length - htmlCursor));
  const htmlCodeRanges: Array<{ start: number; end: number }> = [];
  const findHtmlCode = (node: DefaultTreeAdapterMap['node']): void => {
    if ('tagName' in node && (node.tagName === 'pre' || node.tagName === 'code') && node.sourceCodeLocation) {
      htmlCodeRanges.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset });
    } else if ('childNodes' in node) {
      for (const child of node.childNodes) findHtmlCode(child);
    }
  };
  findHtmlCode(parseFragment(htmlFragments.join(''), { sourceCodeLocationInfo: true }));
  const definitions = new Map<string, string>();
  const collectDefinitions = (node: MarkdownNode): void => {
    if (node.type === 'definition' && node.identifier !== undefined && node.url !== undefined) {
      const start = node.position?.start.offset;
      if (start !== undefined && htmlCodeRanges.some(range => start > range.start && start < range.end)) return;
      // remark normalizes identifiers; references resolve to the first matching definition.
      if (!definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
    }
    for (const child of node.children ?? []) collectDefinitions(child);
  };
  collectDefinitions(document);
  const fragments: string[] = [];
  const codeLiterals: string[] = [];
  let cursor = 0;
  const angleDestination = (node: MarkdownNode, start: number, end: number) => {
    // Links expose label offsets. Image alt has no child positions: anchor its destination to
    // the inline construct's end (including an optional title), not a bracket inside alt/code.
    const imageTail =
      node.type === 'image'
        ? /\]\([\t\n\r ]*<(?:\\[\s\S]|[^\\>])*?>(?:[\t\n\r ]+(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\((?:\\[\s\S]|[^)\\])*\)))?[\t\n\r ]*\)$/.exec(
            html.slice(start, end)
          )
        : undefined;
    const children = node.children;
    const bracket =
      node.type === 'image'
        ? imageTail
          ? start + imageTail.index
          : undefined
        : children?.length
          ? children[children.length - 1]?.position?.end.offset
          : start + 1;
    if (bracket === undefined) return undefined;
    const opening = /^\]\([\t\n\r ]*</.exec(html.slice(bracket, end));
    if (!opening) return undefined;
    const destinationStart = bracket + opening[0].length - 1;
    for (let closing = destinationStart + 1; closing < end; closing++) {
      if (html[closing] === '\\') closing++;
      else if (html[closing] === '>') return { start: destinationStart, end: closing + 1 };
    }
    return undefined;
  };
  const preserveChildren = (node: MarkdownNode, inBlockquote: boolean, blockContainer = false): void => {
    let afterBreak = false;
    for (const child of node.children ?? []) {
      // Container gaps and the start of a hard-break continuation may contain quote markers,
      // not prose. The child's parsed position starts after those markers.
      if (inBlockquote && (blockContainer || afterBreak)) cursor = child.position?.start.offset ?? cursor;
      preserveMarkdown(child, inBlockquote);
      afterBreak = child.type === 'break';
    }
  };
  const preserveMarkdown = (node: MarkdownNode, inBlockquote = false): void => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if ((node.type === 'code' || node.type === 'inlineCode') && start !== undefined && end !== undefined) {
      if (htmlCodeRanges.some(range => start >= range.start && end <= range.end)) return;
      // A quoted block's raw slice includes line markers; remark's literal excludes them while
      // retaining code whitespace. Keep language/meta too, and leave unquoted block source intact.
      // CommonMark code spans render each line ending as one space, without collapsing spaces/tabs.
      codeLiterals.push(
        node.type === 'inlineCode'
          ? node.value!.replace(/\r\n|\r|\n/g, ' ')
          : inBlockquote
            ? JSON.stringify([node.lang ?? null, node.meta ?? null, node.value])
            : html.slice(start, end)
      );
      fragments.push(html.slice(cursor, start), node.type === 'code' ? '<pre></pre>' : '<code></code>');
      cursor = end;
    } else if (
      node.type === 'text' &&
      (inBlockquote || node.value?.includes('<')) &&
      start !== undefined &&
      end !== undefined
    ) {
      if (htmlCodeRanges.some(range => start > range.start && start < range.end)) return;
      // Parsed text owns literal angle brackets and excludes a quoted line's marker.
      // Escape it before parse5 so escaped tags cannot become HTML a second time.
      fragments.push(html.slice(cursor, start), node.value!.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
      cursor = end;
    } else if (node.type === 'html' && inBlockquote && start !== undefined && end !== undefined) {
      // Raw HTML blocks also expose their content without the surrounding quote's line markers.
      fragments.push(html.slice(cursor, start), node.value!);
      cursor = end;
    } else if (
      (node.type === 'paragraph' ||
        node.type === 'heading' ||
        node.type === 'list' ||
        node.type === 'listItem' ||
        node.type === 'blockquote') &&
      start !== undefined &&
      end !== undefined
    ) {
      // Markdown-looking structure inside raw HTML code remains literal text.
      if (
        htmlCodeRanges.some(
          range => (start > range.start && start < range.end) || (end > range.start && end < range.end)
        )
      ) {
        preserveChildren(node, inBlockquote);
        return;
      }
      let tag = 'p';
      if (node.type === 'list') tag = node.ordered ? 'ol' : 'ul';
      else if (node.type === 'listItem') tag = 'li';
      else if (node.type === 'heading') tag = `h${node.depth}`;
      else if (node.type === 'blockquote') tag = 'blockquote';
      const quoted = inBlockquote || node.type === 'blockquote';
      // List markers and indentation are presentation; remark owns nesting and effective numbering.
      if (node.type !== 'listItem') fragments.push(html.slice(cursor, start));
      fragments.push(tag === 'ol' ? `<ol start="${node.start ?? 1}">` : `<${tag}>`);
      // Heading children exclude heading markers; quote children exclude opening quote markers.
      cursor =
        node.type === 'listItem' || node.type === 'heading' || node.type === 'blockquote'
          ? (node.children?.[0]?.position?.start.offset ?? end)
          : start;
      preserveChildren(node, quoted, node.type === 'blockquote' || node.type === 'list' || node.type === 'listItem');
      const contentEnd =
        node.type === 'heading' ? (node.children?.[node.children.length - 1]?.position?.end.offset ?? end) : end;
      fragments.push(node.type === 'blockquote' ? '' : html.slice(cursor, contentEnd), `</${tag}>`);
      cursor = end;
    } else if (node.type === 'break' && start !== undefined) {
      // A hard break is explicit document structure: adding, removing or moving it changes meaning
      // even when the surrounding prose collapses to the same sentence. Hard-break notation inside
      // raw HTML code is literal text, not document structure.
      if (htmlCodeRanges.some(range => start > range.start && start < range.end)) return;
      fragments.push(html.slice(cursor, start), '<br>');
      if (end !== undefined) cursor = end;
    } else if (
      (node.type === 'linkReference' || node.type === 'imageReference') &&
      node.identifier !== undefined &&
      start !== undefined &&
      end !== undefined
    ) {
      if (htmlCodeRanges.some(range => start > range.start && start < range.end)) return;
      preserveChildren(node, inBlockquote);
      const destination = definitions.get(node.identifier);
      if (destination !== undefined) {
        // Retain reference notation and label literals, but carry the resolved URL through parse5.
        // A definition's angle destination alone would otherwise be consumed as an HTML tag.
        const url = destination.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        fragments.push(
          html.slice(cursor, end),
          node.type === 'imageReference'
            ? `<img src="${url}" alt="${(node.alt ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`
            : `<a href="${url}"></a>`
        );
        cursor = end;
      }
    } else if (
      node.type === 'link' &&
      node.url !== undefined &&
      start !== undefined &&
      end !== undefined &&
      html[start] === '<'
    ) {
      // An autolink's destination and displayed address are meaning: a URL change must survive the
      // HTML comparison. Angle notation inside raw HTML code stays literal text, not a link.
      if (htmlCodeRanges.some(range => start > range.start && start < range.end)) return;
      // Autolinks have one text child. Escape parser values so HTML decoding preserves them exactly.
      const label = node.children![0]!.value!;
      fragments.push(
        html.slice(cursor, start),
        `<a href="${node.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`,
        label.replace(/&/g, '&amp;').replace(/</g, '&lt;'),
        '</a>'
      );
      cursor = end;
    } else if (
      (node.type === 'link' || node.type === 'image') &&
      node.url !== undefined &&
      start !== undefined &&
      end !== undefined
    ) {
      const destination = htmlCodeRanges.some(range => start > range.start && start < range.end)
        ? undefined
        : angleDestination(node, start, end);
      // Process the label first so its code literals and explicit breaks keep their existing meaning.
      preserveChildren(node, inBlockquote);
      if (destination) {
        // Only replace <destination>: label/alt, surrounding notation and titles stay in order.
        // Attribute values preserve URL whitespace and escaped entities without HTML re-decoding.
        const url = node.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        fragments.push(
          html.slice(cursor, destination.start),
          node.type === 'image'
            ? `<img src="${url}" alt="${(node.alt ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`
            : `<a href="${url}"></a>`
        );
        cursor = destination.end;
      }
    } else if (node.children) {
      preserveChildren(node, inBlockquote);
    }
  };
  preserveMarkdown(document);
  fragments.push(html.slice(cursor));
  const presentation: Record<string, true> = {
    span: true,
    b: true,
    strong: true,
    i: true,
    em: true,
    u: true,
    font: true,
  };
  const integerAttribute = (node: DefaultTreeAdapterMap['element'], name: string): number | undefined => {
    const value = node.attrs.find(attr => attr.name === name)?.value;
    const digits = value?.match(/^[\t\n\f\r ]*([+-]?\d+)/)?.[1];
    return digits === undefined ? undefined : Number(digits);
  };
  const cellSpan = (node: DefaultTreeAdapterMap['element'], name: 'colspan' | 'rowspan'): number => {
    // HTML parses a signed integer, then rejects values below zero (so -0 remains 0).
    // colspan=0 defaults to 1; rowspan=0 spans the remaining rows in its row group.
    const span = integerAttribute(node, name);
    if (span === undefined || span < 0) return 1;
    return name === 'colspan' ? Math.min(span || 1, 1000) : Math.min(span, 65534);
  };
  const walk = (node: DefaultTreeAdapterMap['node'], ordinal?: number, preserveWhitespace = false): string => {
    preserveWhitespace ||= 'tagName' in node && (node.tagName === 'pre' || node.tagName === 'code');
    if (node.nodeName === '#comment') return '';
    if ('value' in node) return preserveWhitespace ? node.value : node.value.replace(/\s+/g, ' ');
    let children = '';
    if ('childNodes' in node) {
      if ('tagName' in node && node.tagName === 'ol') {
        const reversed = node.attrs.some(attr => attr.name === 'reversed');
        let next =
          integerAttribute(node, 'start') ??
          (reversed ? node.childNodes.filter(child => 'tagName' in child && child.tagName === 'li').length : 1);
        children = node.childNodes
          .map(child => {
            if (!('tagName' in child) || child.tagName !== 'li') return walk(child, undefined, preserveWhitespace);
            next = integerAttribute(child, 'value') ?? next;
            const meaning = walk(child, next, preserveWhitespace);
            next += reversed ? -1 : 1;
            return meaning;
          })
          .join('');
      } else {
        children = node.childNodes.map(child => walk(child, undefined, preserveWhitespace)).join('');
      }
    }
    if (!('tagName' in node) || presentation[node.tagName]) return children;
    const attributes = node.attrs.filter(attr => ['href', 'src', 'alt'].includes(attr.name));
    if (node.tagName === 'td' || node.tagName === 'th') {
      for (const name of ['colspan', 'rowspan'] as const) {
        const span = cellSpan(node, name);
        if (span !== 1) attributes.push({ name, value: String(span) });
      }
    }
    attributes.sort((a, b) => a.name.localeCompare(b.name));
    return `<${node.tagName}${JSON.stringify(attributes)}${ordinal === undefined ? '' : `#${ordinal}`}>${preserveWhitespace ? children : children.trim()}</${node.tagName}>`;
  };
  return JSON.stringify([walk(parseFragment(fragments.join(''))).trim(), codeLiterals]);
}
