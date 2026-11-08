import { parseFragment } from 'parse5';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { assertDocumentStructure, decodeHtml, encodeHtml } from '../codecs/htmlPlaceholderCodec';

describe('Image alternative text translation', () => {
  it.each([
    [
      'HTML',
      '<p>소개<img src="https://example.com/a.png" alt="문서 편집 화면" width="42"></p>',
      '<p>Introduction<img src="https://example.com/a.png" alt="Document editor" width="42"></p>',
    ],
    [
      'Markdown',
      '소개 ![문서 편집 화면](https://example.com/a.png "제목")',
      'Introduction ![Document editor](https://example.com/a.png "제목")',
    ],
    [
      'reference',
      '![문서 편집 화면][화면]\n\n[화면]: https://example.com/a.png',
      '![Document editor][화면]\n\n[화면]: https://example.com/a.png',
    ],
    [
      'collapsed reference',
      '![문서 편집 화면][]\n\n[문서 편집 화면]: https://example.com/a.png',
      '![Document editor][문서 편집 화면]\n\n[문서 편집 화면]: https://example.com/a.png',
    ],
    [
      'shortcut reference',
      '![문서 편집 화면]\n\n[문서 편집 화면]: https://example.com/a.png',
      '![Document editor][문서 편집 화면]\n\n[문서 편집 화면]: https://example.com/a.png',
    ],
  ])('%s의 alt만 번역하고 이미지 목적지와 속성을 유지한다', (_kind, source, expected) => {
    const encoded = encodeHtml(source);
    expect(encoded.encodedText).toContain('문서 편집 화면');
    const translated = decodeHtml(
      encoded.encodedText.replace('문서 편집 화면', 'Document editor').replace('소개', 'Introduction'),
      encoded
    );
    expect(translated).toBe(expected);
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each(['"', "'", ''])('HTML alt의 %j 구분자에서도 새 따옴표·entity·줄바꿈이 속성을 탈출하지 않는다', quote => {
    const source = `<img src="https://example.com/a.png" alt=${quote}편집${quote} data-note="a > b">`;
    const encoded = encodeHtml(source);
    const translated = decodeHtml(encoded.encodedText.replace('편집', 'Editor "draft" & \'review\'\nnext >'), encoded);
    const image = parseFragment(translated).childNodes[0];
    expect(image).toMatchObject({
      tagName: 'img',
      attrs: [
        { name: 'src', value: 'https://example.com/a.png' },
        { name: 'alt', value: 'Editor "draft" & \'review\'\nnext >' },
        { name: 'data-note', value: 'a > b' },
      ],
    });
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it('Markdown alt의 새 괄호·entity·줄바꿈을 텍스트로 복원하고 URL 주입을 막는다', () => {
    const source = '![화면](https://example.com/original.png)';
    const encoded = encodeHtml(source);
    const replacement = 'Editor ](https://evil.invalid) ![extra & text\nnext';
    const translated = decodeHtml(encoded.encodedText.replace('화면', replacement), encoded);
    expect(unified().use(remarkParse).parse(translated)).toMatchObject({
      children: [
        {
          children: [
            {
              type: 'image',
              url: 'https://example.com/original.png',
              alt: replacement,
            },
          ],
        },
      ],
    });
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it('빈 장식용 alt와 code/pre·Markdown code의 이미지 literal은 바이트 그대로 보호한다', () => {
    const source =
      '<img src="a.png" alt=""> <code><img alt="리터럴" src="b.png"></code>\n\n<pre>![리터럴](c.png)</pre>\n\n`![리터럴](d.png)`\n\n```\n<img alt="리터럴" src="e.png">\n```';
    const encoded = encodeHtml(source);
    expect(encoded.encodedText).not.toContain('리터럴');
    expect(decodeHtml(encoded.encodedText, encoded)).toBe(source);
  });

  it.each([
    [
      '<img src="a.png" alt="편집 &quot;화면&quot;\n다음 &amp; 단계">',
      '<img src="a.png" alt="Editor &quot;screen&quot;\nNext &amp; step">',
    ],
    ['![편집 \\[화면\\] &amp; 단계](a.png)', '![Editor \\[screen\\] &amp; step](a.png)'],
  ])('원문의 entity·escape·줄바꿈을 유지하며 alt 본문을 번역한다: %s', (source, expected) => {
    const encoded = encodeHtml(source);
    const translated = decodeHtml(
      encoded.encodedText
        .replace('편집', 'Editor')
        .replace('화면', 'screen')
        .replace('다음', 'Next')
        .replace('단계', 'step'),
      encoded
    );
    expect(translated).toBe(expected);
    expect(() => assertDocumentStructure(source, translated)).not.toThrow();
  });

  it.each(['<img src="a.png" alt="화면">', '![화면](a.png)'])(
    '비어 있지 않은 alt를 누락한 응답은 거절한다: %s',
    source => {
      const encoded = encodeHtml(source);
      expect(() => decodeHtml(encoded.encodedText.replace('화면', ''), encoded)).toThrow(/omitted image/);
    }
  );

  it.each([
    ['<img src="a.png" alt="화면">', '<img src="b.png" alt="Screen">'],
    ['<img src="a.png" alt="화면">', '<img src="a.png" alt="Screen" onload="alert(1)">'],
    ['![화면](a.png)', '![Screen](b.png)'],
    ['![화면](a.png)', '![Screen](a.png) ![Extra](b.png)'],
  ])('alt 번역 외의 이미지 URL·속성·개수 변경을 거절한다', (source, translated) => {
    expect(() => assertDocumentStructure(source, translated)).toThrow(/structure/);
  });
});
