import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { assertDocumentStructure, decodeHtml, encodeHtml } from '../codecs/htmlPlaceholderCodec';

describe('Document placeholder fidelity', () => {
  it('보호할 바이트를 그대로 유지하며 quoted >, comment, entity, brand, URL, 숫자와 리터럴을 번역하지 않는다', () => {
    const source =
      '<p data-note="a > b">한국어 Darun 42 &amp; ⟦HTML_0000⟧ <a href="https://example.com/a?x=1&y=2">링크</a><!-- comment > --></p>';
    const encoded = encodeHtml(source);
    expect(encoded.encodedText).toContain('한국어');
    expect(encoded.encodedText).not.toContain('Darun');
    // A random placeholder nonce may contain the same digits; the source number must stay protected.
    expect(encoded.encodedText).not.toMatch(/\b42\b/);
    expect(encoded.encodedText).not.toContain('&amp;');
    const translated = decodeHtml(
      encoded.encodedText.replace('한국어', 'Korean').replace('링크', 'Link'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(
      '<p data-note="a > b">Korean Darun 42 &amp; ⟦HTML_0000⟧ <a href="https://example.com/a?x=1&y=2">Link</a><!-- comment > --></p>'
    );
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it('Markdown 중첩 목록, 인용, code와 link 목적지를 위치 정보로 보존한다', () => {
    const source =
      '> 인용\n>\n> - 목록\n>   1. 중첩 **강조** [링크](https://example.com/a "title > x")\n\n`literal 7` &copy;';
    const encoded = encodeHtml(source);
    const translated = decodeHtml(
      encoded.encodedText
        .replace('인용', 'Quote')
        .replace('목록', 'List')
        .replace('중첩', 'Nested')
        .replace('강조', 'Emphasis')
        .replace('링크', 'Link'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(
      '> Quote\n>\n> - List\n>   1. Nested **Emphasis** [Link](https://example.com/a "title > x")\n\n`literal 7` &copy;'
    );
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each(['[안내][]', '[안내]'])(
    '%s의 표시 문구는 영어로 바꾸고 definition 이름과 실제 목적지는 별도로 보존한다',
    reference => {
      const source = `${reference} [본문][안내] ![대체][안내]\n\n[안내]: <https://example.com/docs?x=1&amp;y=2> "Guide"`;
      const encoded = encodeHtml(source);
      const translated = decodeHtml(
        encoded.encodedText.replace('안내', 'Directions').replace('본문', 'Article'),
        encoded.placeholders,
        encoded.tokenOrder
      );
      expect(translated).toBe(
        '[Directions][안내] [Article][안내] ![대체][안내]\n\n[안내]: <https://example.com/docs?x=1&amp;y=2> "Guide"'
      );
      expect(() => assertDocumentStructure(source, translated)).not.toThrow();
      // Explicit expected labels/identifier and independently parsed definition URL prove resolution,
      // rather than trusting a codec round-trip or merely checking nonempty output.
      expect(unified().use(remarkParse).parse(translated)).toMatchObject({
        children: [
          {
            children: [
              { type: 'linkReference', referenceType: 'full', identifier: '안내', children: [{ value: 'Directions' }] },
              { type: 'text', value: ' ' },
              { type: 'linkReference', referenceType: 'full', identifier: '안내', children: [{ value: 'Article' }] },
              { type: 'text', value: ' ' },
              { type: 'imageReference', identifier: '안내', alt: '대체' },
            ],
          },
          { type: 'definition', identifier: '안내', url: 'https://example.com/docs?x=1&y=2', title: 'Guide' },
        ],
      });
    }
  );

  it('혼용·공유 참조의 entity·escape·브랜드·숫자와 inline/HTML 링크·code literal을 보존한다', () => {
    const source =
      '[안내][] [안내] [본문][안내] [안내 &amp; 조건][] [안내\\!][] Darun 42 [본문](https://example.com/inline) <a href="https://example.com/html">본문</a> ![대체][] ![대체] `[안내][]`\n\n[안내]: https://example.com/a\n[안내 &amp; 조건]: https://example.com/b\n[안내\\!]: https://example.com/c\n[대체]: https://example.com/image.png\n\n```\n[안내][]\n```';
    const encoded = encodeHtml(source);
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('안내', 'Guide').replaceAll('본문', 'Body').replaceAll('조건', 'Terms'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(
      '[Guide][안내] [Guide][안내] [Body][안내] [Guide &amp; Terms][안내 &amp; 조건] [Guide\\!][안내\\!] Darun 42 [Body](https://example.com/inline) <a href="https://example.com/html">Body</a> ![대체][] ![대체] `[안내][]`\n\n[안내]: https://example.com/a\n[안내 &amp; 조건]: https://example.com/b\n[안내\\!]: https://example.com/c\n[대체]: https://example.com/image.png\n\n```\n[안내][]\n```'
    );
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it('HTML code 안 참조는 literal로 남고 Markdown code 안 HTML은 뒤 본문·참조 번역을 막지 않는다', () => {
    const source = '<code>[안내][]</code> `[안내] <code>` 본문 [안내][]\n\n[안내]: https://example.com/a';
    const encoded = encodeHtml(source);
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('안내', 'Directions').replaceAll('본문', 'Body'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(
      '<code>[안내][]</code> `[안내] <code>` Body [Directions][안내]\n\n[안내]: https://example.com/a'
    );
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each([
    ['inline code', '본문 <code>안내</code> 더보기', 'Body <code>안내</code> More'],
    [
      '중첩 inline code와 공백',
      '본문 <code>  안내<span>중첩</span>\r\n\t리터럴 </code> 더보기',
      'Body <code>  안내<span>중첩</span>\r\n\t리터럴 </code> More',
    ],
    [
      'pre의 직접 text와 하위 wrapper',
      '<div>본문<pre>  안내\n<span>중첩\t리터럴 </span>\n</pre>더보기</div>',
      '<div>Body<pre>  안내\n<span>중첩\t리터럴 </span>\n</pre>More</div>',
    ],
  ])('%s의 literal은 숨기고 바깥 본문만 번역한다', (_kind, source, expected) => {
    const encoded = encodeHtml(source);
    expect(encoded.encodedText).toContain('본문');
    expect(encoded.encodedText).toContain('더보기');
    for (const literal of ['안내', '중첩', '리터럴']) expect(encoded.encodedText).not.toContain(literal);
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('본문', 'Body').replaceAll('더보기', 'More').replaceAll('안내', 'Guide'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(expected);
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each([
    ['escaped code pair', '\\<code> **번역 대상** \\</code>', '\\<code> **Translation target** \\</code>'],
    ['escaped pre pair', '\\<pre> **번역 대상** \\</pre>', '\\<pre> **Translation target** \\</pre>'],
    ['escaped opening code', '\\<code> **번역 대상** </code>', '\\<code> **Translation target** </code>'],
    ['escaped opening pre', '\\<pre> **번역 대상** </pre>', '\\<pre> **Translation target** </pre>'],
    ['escaped closing code', '<code> **번역 대상** \\</code>', '<code> **번역 대상** \\</code>'],
    ['escaped closing pre', '<pre> **번역 대상** \\</pre>', '<pre> **번역 대상** \\</pre>'],
    ['even backslashes', '\\\\<code> **번역 대상** </code>', '\\\\<code> **번역 대상** </code>'],
    ['odd backslashes', '\\\\\\<code> **번역 대상** \\</code>', '\\\\\\<code> **Translation target** \\</code>'],
  ])('%s는 Markdown이 해석한 실제 HTML 위치에서만 literal을 보호한다', (_kind, source, expected) => {
    const encoded = encodeHtml(source);
    expect(encoded.encodedText.includes('번역 대상')).toBe(expected.includes('Translation target'));
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('번역 대상', 'Translation target'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(expected);
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it('escaped 태그의 본문·강조·참조는 번역하고 혼용된 실제 HTML literal은 숨긴다', () => {
    const source =
      '\\<code> **본문** [안내][] \\</code> <code>  고정<span>하위</span>\r\n\t값 </code>\n\n\\<pre> [안내] 본문 \\</pre>\n\n<pre>  원문\n<span>리터럴</span> </pre>\n\n[안내]: <https://example.com/docs?x=1&amp;y=2> "Guide"';
    const encoded = encodeHtml(source);
    expect(encoded.encodedText).toContain('본문');
    expect(encoded.encodedText).toContain('안내');
    for (const literal of ['고정', '하위', '값', '원문', '리터럴']) expect(encoded.encodedText).not.toContain(literal);
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('본문', 'Article').replaceAll('안내', 'Directions'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe(
      '\\<code> **Article** [Directions][안내] \\</code> <code>  고정<span>하위</span>\r\n\t값 </code>\n\n\\<pre> [Directions][안내] Article \\</pre>\n\n<pre>  원문\n<span>리터럴</span> </pre>\n\n[안내]: <https://example.com/docs?x=1&amp;y=2> "Guide"'
    );
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each(['```\n[안내] <code>\n```', '    [안내] <pre>'])(
    '%s의 HTML-looking text는 뒤 본문·참조 번역을 막지 않는다',
    literal => {
      const source = `${literal}\n\n본문 [안내][]\n\n[안내]: https://example.com/a`;
      const encoded = encodeHtml(source);
      const translated = decodeHtml(
        encoded.encodedText.replaceAll('본문', 'Body').replaceAll('안내', 'Directions'),
        encoded.placeholders,
        encoded.tokenOrder
      );
      expect(translated).toBe(`${literal}\n\nBody [Directions][안내]\n\n[안내]: https://example.com/a`);
      expect(() => assertDocumentStructure(source, translated)).not.toThrow();
    }
  );

  it('raw HTML block의 backslash는 Markdown escape가 아니며 script/style literal도 계속 보호한다', () => {
    const source = '<div>본문 \\<code>고정</code><script>실행금지</script><style>서식금지</style> 더보기</div>';
    const encoded = encodeHtml(source);
    for (const literal of ['고정', '실행금지', '서식금지']) expect(encoded.encodedText).not.toContain(literal);
    const translated = decodeHtml(
      encoded.encodedText.replaceAll('본문', 'Body').replaceAll('더보기', 'More'),
      encoded.placeholders,
      encoded.tokenOrder
    );
    expect(translated).toBe('<div>Body \\<code>고정</code><script>실행금지</script><style>서식금지</style> More</div>');
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each([
    ['actual destination', '[Guide][안내]\n\n[안내]: https://example.com/changed\n[other]: https://example.com/a'],
    ['another definition', '[Guide][other]\n\n[안내]: https://example.com/a\n[other]: https://example.com/a'],
    ['lost reference', '[Guide]\n\n[안내]: https://example.com/a\n[other]: https://example.com/a'],
    ['new structure', '[**Guide**][안내]\n\n[안내]: https://example.com/a\n[other]: https://example.com/a'],
  ])('%s 손상은 영어 표시 문구를 허용해도 계속 거절한다', (_kind, translated) => {
    const source = '[안내][]\n\n[안내]: https://example.com/a\n[other]: https://example.com/a';
    expect(() => assertDocumentStructure(source, translated)).toThrow(/Markdown structure/);
  });

  it('동일 집합의 순서 변경, 중복, 누락과 알 수 없는 토큰을 거부한다', () => {
    const encoded = encodeHtml('<p>설명</p>');
    const [first, second] = encoded.tokenOrder;
    expect(() => decodeHtml(`${second}Text${first}`, encoded.placeholders, encoded.tokenOrder)).toThrow(
      /order mismatch/
    );
    expect(() => decodeHtml(`${first}Text${first}`, encoded.placeholders, encoded.tokenOrder)).toThrow();
    expect(() => decodeHtml('Text', encoded.placeholders, encoded.tokenOrder)).toThrow(/count mismatch/);
    expect(() => decodeHtml(`${encoded.encodedText}${first}`, encoded.placeholders, encoded.tokenOrder)).toThrow();
  });

  it('번역이 새 Markdown/HTML 구조를 주입하면 거부한다', () => {
    expect(() => assertDocumentStructure('일반 문장', '# Heading')).toThrow(/Markdown structure/);
    const encoded = encodeHtml('<p>문장</p>');
    expect(() =>
      decodeHtml(encoded.encodedText + '<script>bad</script>', encoded.placeholders, encoded.tokenOrder)
    ).toThrow(/introduced HTML/);
  });

  it('문서의 들여쓰기 code block과 fence 본문은 placeholder로 숨겨져 원문 바이트로 복원한다', () => {
    const source = '한국어 설명\n\n    들여쓰기 코드 블록\n\n```\n펜스 코드\n```';
    const encoded = encodeHtml(source);
    // The document codec hides code content as immutable placeholders (plain fields bypass it).
    expect(encoded.encodedText).toContain('한국어');
    expect(encoded.encodedText).not.toContain('들여쓰기 코드 블록');
    expect(encoded.encodedText).not.toContain('펜스 코드');
    expect(decodeHtml(encoded.encodedText, encoded.placeholders, encoded.tokenOrder)).toBe(source);
  });
});
