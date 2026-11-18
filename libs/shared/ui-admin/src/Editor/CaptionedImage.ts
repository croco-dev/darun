import Image from '@tiptap/extension-image';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { isCompleteLinkAddress } from './linkAddress';

export type ImageCaption = {
  caption: string;
  credit: string;
  creditUrl: string;
};

const figureSelector = 'figure[data-editor-image]';
const creditLinkSelector = ':scope > figcaption > small > a';

function hasDirectText(element: Element) {
  return [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
}

function isImageCredit(element: Element) {
  if (!element.matches('small')) return false;
  const [link] = element.children;
  if (!link) return true;
  return element.childElementCount === 1 && link.matches('a') && !link.childElementCount && !hasDirectText(element);
}

// Recognize only markup this atomic node can represent. Other figures use normal HTML parsing.
function isCaptionedFigure(figure: HTMLElement) {
  if (figure.childElementCount !== 2 || hasDirectText(figure)) return false;
  const [image, figcaption] = figure.children;
  if (!image?.matches('img[src]:not([src^="data:"])') || !figcaption?.matches('figcaption')) return false;
  if (figcaption.childElementCount > 2 || hasDirectText(figcaption)) return false;

  const [first, second] = figcaption.children;
  if (first?.matches('span') && !first.childElementCount) return !second || isImageCredit(second);
  return !!first && !second && isImageCredit(first);
}

// Keep one selectable image node. Dragging, deletion and alt edits then operate on the whole figure.
export const CaptionedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // TipTap otherwise coerces numeric-looking HTML attributes when reopening the document.
      ...Object.fromEntries(
        ['src', 'alt', 'title'].map(name => [
          name,
          {
            default: null,
            parseHTML: (element: HTMLElement) =>
              (element.matches(figureSelector) ? element.querySelector(':scope > img') : element)?.getAttribute(name),
          },
        ])
      ),
      caption: {
        default: '',
        rendered: false,
        parseHTML: (element: HTMLElement) => element.querySelector(':scope > figcaption > span')?.textContent ?? '',
      },
      credit: {
        default: '',
        rendered: false,
        parseHTML: (element: HTMLElement) =>
          element.querySelector(`${creditLinkSelector}[data-image-default-credit]`)
            ? ''
            : (element.querySelector(':scope > figcaption > small')?.textContent ?? ''),
      },
      creditUrl: {
        default: '',
        rendered: false,
        parseHTML: (element: HTMLElement) => {
          const href = element.querySelector(creditLinkSelector)?.getAttribute('href') ?? '';
          return isCompleteLinkAddress(href) ? href : '';
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: figureSelector,
        getAttrs: (element: HTMLElement) => (isCaptionedFigure(element) ? null : false),
      },
      ...(this.parent?.() ?? []),
    ];
  },
  renderHTML(props) {
    const image = this.parent!(props);
    const attrs = props.node.attrs;
    const caption = typeof attrs.caption === 'string' ? attrs.caption : '';
    const credit = typeof attrs.credit === 'string' ? attrs.credit : '';
    const href = typeof attrs.creditUrl === 'string' && isCompleteLinkAddress(attrs.creditUrl) ? attrs.creditUrl : '';
    if (!caption && !credit && !href) return image;

    const children: [string, ...DOMOutputSpec[]] = ['figcaption'];
    if (caption) children.push(['span', caption]);
    if (credit || href) {
      const source: DOMOutputSpec = href
        ? [
            'a',
            {
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
              'data-image-default-credit': credit ? null : '',
            },
            credit || '이미지 출처',
          ]
        : credit;
      if (caption) children.push(' ');
      children.push(['small', source]);
    }
    return ['figure', { 'data-editor-image': '' }, image, children];
  },
});
