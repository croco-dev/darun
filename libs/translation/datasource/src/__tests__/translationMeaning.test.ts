import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { translationMeaning } from '../codecs/translationMeaning';
import {
  meaningChanges,
  meaningPreservingEdits,
  orderedListItemValueChange,
} from './descriptionMeaningTransitions.fixture';

describe('translationMeaning 목록 번호', () => {
  it.each([
    ['시작 번호', '<ol start="1"><li>본문</li><li>조건</li></ol>', '<ol start="5"><li>본문</li><li>조건</li></ol>'],
    [
      '역순',
      '<ol><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol reversed><li>본문</li><li>조건</li><li>기능</li></ol>',
    ],
    ['항목 번호', ...orderedListItemValueChange.source],
    [
      '중첩 목록',
      '<ol><li>본문<ol start="2"><li>조건</li></ol></li><li>기능</li></ol>',
      '<ol><li>본문<ol start="7"><li>조건</li></ol></li><li>기능</li></ol>',
    ],
    ['음수 시작', '<ol start="-3"><li>본문</li><li>조건</li></ol>', '<ol start="0"><li>본문</li><li>조건</li></ol>'],
    [
      '같은 시작의 역순',
      '<ol start="5"><li>본문</li><li>조건</li></ol>',
      '<ol start="5" reversed><li>본문</li><li>조건</li></ol>',
    ],
  ])('%s 변경을 의미 변경으로 구분한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['기본 시작 번호', ...meaningPreservingEdits.defaultOrderedListStart.source],
    [
      '번호 표기와 서식',
      '<ol start="5"><li>본문</li><li>조건</li></ol>',
      '<ol style="color:red" class="list" start="05"><li><strong>본문</strong></li><li><span>조건</span></li></ol>',
    ],
    [
      '역순 기본 시작',
      '<ol reversed><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol start="3" reversed="false"><li>본문</li><li>조건</li><li>기능</li></ol>',
    ],
    [
      '동일 항목 번호',
      '<ol start="5"><li>본문</li><li>조건</li><li>기능</li></ol>',
      '<ol><li value="5">본문</li><li value="6">조건</li><li>기능</li></ol>',
    ],
    [
      '잘못된 번호 기본값',
      '<ol><li>본문</li><li>조건</li></ol>',
      '<ol start="bad"><li>본문</li><li value="bad">조건</li></ol>',
    ],
    ['unordered 항목 번호', '<ul><li>본문</li><li>조건</li></ul>', '<ul><li value="8">본문</li><li>조건</li></ul>'],
  ])('%s의 동일 번호 의미는 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['href', '<p><a href="https://example.com/a">본문</a></p>', '<p><a href="https://example.com/b">본문</a></p>'],
    ['src', '<img src="https://example.com/a" alt="본문">', '<img src="https://example.com/b" alt="본문">'],
    ['alt', '<img src="https://example.com/a" alt="본문">', '<img src="https://example.com/a" alt="조건">'],
    ['문서 구조', '<ol><li>본문</li></ol>', '<ul><li>본문</li></ul>'],
  ])('기존 %s 판정을 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it('href/src/alt의 속성 순서는 의미가 같다', () => {
    expect(translationMeaning('<a href="https://example.com"><img src="image" alt="본문"></a>')).toBe(
      translationMeaning(
        '<a class="link" href="https://example.com"><img alt="본문" style="width:20px" src="image"></a>'
      )
    );
  });
});

describe('translationMeaning 코드 공백', () => {
  it.each([
    ['pre 줄바꿈', '<pre>prepare()\nfinish()</pre>', '<pre>prepare() finish()</pre>'],
    [
      'pre/code 조건 안으로 들여쓰기',
      '<pre><code>if ready:\n    send()\nfinish()</code></pre>',
      '<pre><code>if ready:\n    send()\n    finish()</code></pre>',
    ],
    ['pre 앞 공백', '<pre>  prepare()\nfinish()</pre>', '<pre>prepare()\nfinish()</pre>'],
    ['pre 뒤 공백', '<pre>prepare()\nfinish()  </pre>', '<pre>prepare()\nfinish()</pre>'],
    ['pre 마지막 줄바꿈', '<pre>prepare()\nfinish()\n</pre>', '<pre>prepare()\nfinish()</pre>'],
    [
      'pre 하위 presentation wrapper',
      '<pre><span>if ready:\n    send()\n</span><strong>finish()</strong></pre>',
      '<pre><span>if ready:\n    send()\n</span><strong>    finish()</strong></pre>',
    ],
    [
      'code 하위 element 앞뒤 공백',
      '<code><a href="https://example.com/docs">  call() </a></code>',
      '<code><a href="https://example.com/docs">call()</a></code>',
    ],
    ['inline code 연속 공백', ...meaningChanges.htmlInlineCodeSpacing.source],
    ['inline code 앞 공백', '<p>본문 <code> left</code></p>', '<p>본문 <code>left</code></p>'],
    ['inline code 뒤 공백', '<p>본문 <code>left </code></p>', '<p>본문 <code>left</code></p>'],
    ['inline code 탭', '<p>본문 <code>left\tright</code></p>', '<p>본문 <code>left right</code></p>'],
  ])('%s 변경은 단순 서식으로 합치지 않는다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['일반 본문 표시용 공백', '<p>  본문\n  조건  </p>', '<p>본문 조건</p>'],
    [
      '일반 HTML 속성 순서와 presentation wrapper',
      '<p class="before" style="color:red">본문 조건</p>',
      '<p style="color:blue" class="after"><strong>본문 조건</strong></p>',
    ],
    [
      '동일 코드의 서식 wrapper',
      '<pre><code>if ready:\n    send()\nfinish()  </code></pre>',
      '<pre class="code" style="color:red"><code><span>if ready:\n    send()\n</span><b>finish()  </b></code></pre>',
    ],
    ['code 밖 표시용 공백', ...meaningPreservingEdits.textOutsideHtmlCode.source],
  ])('%s는 의미가 같다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown 코드 공백', () => {
  it.each([
    ['fenced 조건 안 finish 들여쓰기', ...meaningChanges.fencedIndentation.source],
    ['tilde fenced 줄바꿈', ...meaningChanges.tildeFenceLineBreak.source],
    ['fenced 연속 공백', ...meaningChanges.fencedSpacing.source],
    ['indented 조건 안 finish 들여쓰기', ...meaningChanges.indentedIndentation.source],
    ['indented 줄바꿈', ...meaningChanges.indentedLineBreak.source],
    ['indented 연속 공백', ...meaningChanges.indentedSpacing.source],
    [
      '인용 안 fenced 들여쓰기',
      '> 본문\n>\n> ```\n> if ready:\n>     send()\n> finish()\n> ```',
      '> 본문\n>\n> ```\n> if ready:\n>     send()\n>     finish()\n> ```',
    ],
    [
      'fenced HTML literal 연속 공백',
      '본문\n\n```html\n<span title="left  right">literal</span>\n```',
      '본문\n\n```html\n<span title="left right">literal</span>\n```',
    ],
    ['fenced 코드와 HTML pre 문서 구조', '```\nleft  right\n```', '<pre>```\nleft  right\n```</pre>'],
  ])('%s 변경을 의미 변경으로 구분한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    [
      '동일 fenced 코드 밖 본문 공백',
      '본문  조건\n\n```python\nif ready:\n    send()\nfinish()\n```\n\n추가  설명',
      '본문 조건\n\n```python\nif ready:\n    send()\nfinish()\n```\n\n추가 설명',
    ],
    [
      '동일 indented 코드 밖 본문 공백',
      '본문  조건\n\n    if ready:\n        send()\n    finish()\n\n추가  설명',
      '본문 조건\n\n    if ready:\n        send()\n    finish()\n\n추가 설명',
    ],
    ['일반 Markdown 본문 줄바꿈', ...meaningPreservingEdits.markdownSoftNewline.source],
    [
      '동일 fenced HTML literal 밖 본문 공백',
      '본문\n\n```html\n<pre>\n```\n\n추가  설명',
      '본문\n\n```html\n<pre>\n```\n\n추가 설명',
    ],
  ])('%s는 의미가 같다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['LF', '소개 `left\nright`'],
    ['CRLF', '소개 `left\r\nright`'],
    ['CR', '소개 `left\rright`'],
  ])('inline code의 %s는 CommonMark line ending 하나를 space 하나로 비교한다', (_kind, source) => {
    expect(JSON.parse(translationMeaning(source))).toEqual(['<p[]>소개 <code[]></code></p>', ['left right']]);
    expect(translationMeaning(source)).toBe(translationMeaning('소개 `left right`'));
  });

  it.each([
    ['newline 옆 space', '소개 `left \nright`', '소개 `left  right`'],
    ['newline 옆 tab', '소개 `left\t\nright`', '소개 `left\t right`'],
  ])('%s는 line ending만 space로 바꾸고 이웃 공백은 유지한다', (_kind, source, equivalent) => {
    expect(translationMeaning(source)).toBe(translationMeaning(equivalent));
    expect(translationMeaning(source)).not.toBe(translationMeaning('소개 `left right`'));
  });

  it.each([
    ['inline 연속 space', '소개 `left  right`', '소개 `left right`'],
    ['inline tab', '소개 `left\tright`', '소개 `left right`'],
    ['HTML code newline', '소개 <code>left\nright</code>', '소개 <code>left right</code>'],
  ])('%s 차이는 inline-code line ending 동등성으로 합치지 않는다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown 문단과 inline code', () => {
  it.each([
    ['문단 병합', ...meaningChanges.paragraphMerge.source],
    ['문단 분리', ...meaningChanges.paragraphSplit.source],
    ['같은 문단 수의 경계 이동', '소개\n\n주의 조건', '소개 주의\n\n조건'],
    ['inline code 공백 축소', ...meaningChanges.inlineCodeSpaceReduction.source],
    ['inline code 공백 증가', ...meaningChanges.inlineCodeSpaceIncrease.source],
    ['inline code의 HTML literal', '본문 `<span>left  right</span>`', '본문 `<span>left right</span>`'],
    ['HTML code의 backtick 앞뒤 공백', '<code>` left `</code>', '<code>`left`</code>'],
    [
      'Markdown HTML code literal 뒤의 inline 공백',
      "본문 `<code>` 조건 `printf 'a  b'`",
      "본문 `<code>` 조건 `printf 'a b'`",
    ],
    ['문단 안 inline code 위치', '본문 `left` 조건 `right`', '본문 `right` 조건 `left`'],
  ])('%s는 실제 구조 또는 literal 의미 변경이다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['같은 문단의 soft newline', '소개\n주의', '소개 주의'],
    ['같은 문단의 표시용 연속 공백', ...meaningPreservingEdits.paragraphDisplaySpacing.source],
    ['같은 문단 경계의 빈 줄 추가', ...meaningPreservingEdits.paragraphBlankLines.source],
    ['같은 literal 밖의 soft newline', ...meaningPreservingEdits.textBeforeInlineCodeNewline.source],
    ['같은 literal 밖의 연속 공백', ...meaningPreservingEdits.textOutsideInlineCodeSpacing.source],
    ['같은 inline literal의 delimiter', ...meaningPreservingEdits.inlineCodeDelimiters.source],
    ['같은 Markdown 문단의 HTML 서식', '소개 <strong>주의</strong>', '소개 <span>주의</span>'],
    [
      'HTML code 안 backtick literal의 presentation wrapper',
      '<code>` left  right `</code>',
      '<code><span>` left  right `</span></code>',
    ],
    [
      'HTML code의 문단처럼 보이는 literal 줄바꿈과 wrapper',
      '<code>left\n\nright</code>',
      '<code><span>left\n\nright</span></code>',
    ],
  ])('%s는 search-only 의미를 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown 제목 경계와 깊이', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['두 제목 병합', ...meaningChanges.headingMerge.source],
    ['한 제목 분리', ...meaningChanges.headingSplit.source],
    ['같은 본문의 깊이 증가', ...meaningChanges.headingDepthIncrease.source],
    ['같은 본문의 깊이 감소', ...meaningChanges.headingDepthDecrease.source],
    ['같은 제목 수의 경계 이동', '# 소개\n# 주의 조건', '# 소개 주의\n# 조건'],
    ['목록 안 제목 깊이', '- # 소개\n- ## 주의', '- # 소개\n- ### 주의'],
    ['제목 안 inline code literal', '# 소개 `left  right`', '# 소개 `left right`'],
    ['제목 안 링크 목적지', '# [소개](<https://example.com/a>)', '# [소개](<https://example.com/b>)'],
  ])('%s는 실제 문서 의미 변경이다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    [
      '# 소개\n# 주의',
      [
        { depth: 1, text: '소개' },
        { depth: 1, text: '주의' },
      ],
    ],
    ['# 소개 # 주의', [{ depth: 1, text: '소개 # 주의' }]],
    [
      '# 소개\n## 주의',
      [
        { depth: 1, text: '소개' },
        { depth: 2, text: '주의' },
      ],
    ],
    [
      '소개\n===\n\n주의\n---',
      [
        { depth: 1, text: '소개' },
        { depth: 2, text: '주의' },
      ],
    ],
    [
      '# 소개 ###\n\n## 주의 ##',
      [
        { depth: 1, text: '소개' },
        { depth: 2, text: '주의' },
      ],
    ],
  ] as const)('%s의 remark 제목 개수·깊이·본문은 명시한 문서 구조와 일치한다', (source, expected) => {
    const document = markdown.parse(source);
    expect(document.children).toHaveLength(expected.length);
    expect(document.children).toMatchObject(
      expected.map(({ depth, text }) => ({
        type: 'heading',
        depth,
        children: [{ type: 'text', value: text }],
      }))
    );
  });

  it.each([
    ['ATX와 setext', ...meaningPreservingEdits.headingAtxToSetext.source],
    ['setext와 ATX 역방향', ...meaningPreservingEdits.headingSetextToAtx.source],
    ['닫는 marker', ...meaningPreservingEdits.headingClosingMarkers.source],
    ['여섯 단계 제목의 닫는 marker', '###### 소개', '###### 소개 ##'],
    ['제목 앞 들여쓰기와 표시용 공백', '# 소개  조건\n## 주의', '  # 소개 조건  ###\n ## 주의 #'],
    ['일반 본문 표시용 공백', ...meaningPreservingEdits.headingBodySpacing.source],
    ['빈 제목의 marker', '#', '# ###'],
    ['같은 inline code와 제목 marker', '# 소개 `left  right`', '# 소개 `left  right` ###'],
  ])('%s는 같은 제목 경계·깊이·본문의 search-only 의미다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['inline', '`# 소개`'],
    ['fenced', '```\n# 소개\n# 주의\n```'],
    ['indented', '    # 소개\n    # 주의'],
    ['HTML pre', '<pre>\n\n# 소개\n# 주의\n\n</pre>'],
    ['HTML code', '<code>\n\n# 소개\n# 주의\n\n</code>'],
  ])('%s code 안 제목 표기는 heading으로 재해석하지 않는다', (_kind, source) => {
    const [documentMeaning] = JSON.parse(translationMeaning(source)) as [string, string[]];
    expect(documentMeaning).not.toMatch(/<h[1-6]/);
    expect(translationMeaning(source)).not.toBe(translationMeaning(source.replace('# 소개', '## 소개')));
  });
});

describe('translationMeaning Markdown 인용 경계와 본문', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['줄별 marker를 본문 literal로 합침', ...meaningChanges.quoteMarkerMerge.source],
    ['본문 literal을 줄별 marker로 분리', ...meaningChanges.quoteMarkerSplit.source],
    ['인용 제거', ...meaningChanges.quoteRemoval.source],
    ['인용 추가', ...meaningChanges.quoteAddition.source],
    ['인용 안 문단 분리', '> 소개\n> 주의', '> 소개\n>\n> 주의'],
    ['독립 인용 경계', ...meaningChanges.separateQuoteBoundary.source],
    ['중첩 추가', ...meaningChanges.quoteNestingAddition.source],
    ['중첩 제거', ...meaningChanges.quoteNestingRemoval.source],
    ['인용 경계 이동', '> 소개\n\n주의 조건', '소개 주의\n\n> 조건'],
    ['인용 안 제목 깊이', '> # 소개', '> ## 소개'],
    ['인용 안 목록 중첩', '> - 소개\n> - 주의', '> - 소개\n>   - 주의'],
    ['인용 안 hard break', '> 소개\n> 주의', '> 소개  \n> 주의'],
    ['인용 안 링크 목적지', '> [소개](<https://example.com/a>)', '> [소개](<https://example.com/b>)'],
    ['인용 안 inline literal 공백', '> 소개 `left  right`', '> 소개 `left right`'],
    [
      '인용 안 fenced literal 들여쓰기',
      '> ```\n> if ready:\n>     send()\n> ```',
      '> ```\n> if ready:\n> send()\n> ```',
    ],
    ['인용 안 HTML pre literal', '> <pre>\n> > 소개\n> </pre>', '> <pre>\n> >> 소개\n> </pre>'],
  ])('%s는 실제 본문 또는 인용 구조 변경이다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    [
      '> 소개\n> 주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개\n주의' }] }] }],
      '<blockquote[]><p[]>소개 주의</p></blockquote>',
    ],
    [
      '> 소개 > 주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개 > 주의' }] }] }],
      '<blockquote[]><p[]>소개 > 주의</p></blockquote>',
    ],
    [
      '> 소개 주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개 주의' }] }] }],
      '<blockquote[]><p[]>소개 주의</p></blockquote>',
    ],
    [
      '> 소개  주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개  주의' }] }] }],
      '<blockquote[]><p[]>소개 주의</p></blockquote>',
    ],
    [
      '> 소개\n주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개\n주의' }] }] }],
      '<blockquote[]><p[]>소개 주의</p></blockquote>',
    ],
    [
      '>소개\n>주의',
      [{ type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개\n주의' }] }] }],
      '<blockquote[]><p[]>소개 주의</p></blockquote>',
    ],
    [
      '> 소개\n>\n> 주의',
      [
        {
          type: 'blockquote',
          children: [
            { type: 'paragraph', children: [{ type: 'text', value: '소개' }] },
            { type: 'paragraph', children: [{ type: 'text', value: '주의' }] },
          ],
        },
      ],
      '<blockquote[]><p[]>소개</p><p[]>주의</p></blockquote>',
    ],
    [
      '> 소개\n\n> 주의',
      [
        { type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개' }] }] },
        { type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '주의' }] }] },
      ],
      '<blockquote[]><p[]>소개</p></blockquote> <blockquote[]><p[]>주의</p></blockquote>',
    ],
    [
      '> 소개\n> > 주의',
      [
        {
          type: 'blockquote',
          children: [
            { type: 'paragraph', children: [{ type: 'text', value: '소개' }] },
            { type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'text', value: '주의' }] }] },
          ],
        },
      ],
      '<blockquote[]><p[]>소개</p><blockquote[]><p[]>주의</p></blockquote></blockquote>',
    ],
    [
      '>>소개\n>>주의',
      [
        {
          type: 'blockquote',
          children: [
            {
              type: 'blockquote',
              children: [{ type: 'paragraph', children: [{ type: 'text', value: '소개\n주의' }] }],
            },
          ],
        },
      ],
      '<blockquote[]><blockquote[]><p[]>소개 주의</p></blockquote></blockquote>',
    ],
  ] as const)('%s는 명시한 remark 인용 계층·text와 최종 의미를 보존한다', (source, children, meaning) => {
    expect(markdown.parse(source)).toMatchObject({ type: 'root', children });
    expect(JSON.parse(translationMeaning(source))).toEqual([meaning, []]);
  });

  it.each([
    ['soft newline', ...meaningPreservingEdits.quoteSoftNewline.source],
    ['lazy continuation', ...meaningPreservingEdits.quoteLazyContinuation.source],
    ['표시용 연속 공백', ...meaningPreservingEdits.quoteDisplaySpacing.source],
    ['marker 뒤 공백', '>소개\n>주의', '> 소개\n> 주의'],
    ['marker 앞 들여쓰기', ...meaningPreservingEdits.quoteMarkerIndentation.source],
    ['중첩 marker 표현', ...meaningPreservingEdits.nestedQuoteMarkers.source],
    ['같은 인용 안 문단의 빈 줄', '> 소개\n>\n> 주의', '> 소개\n>\n>\n> 주의'],
    ['같은 inline literal 밖 공백', ...meaningPreservingEdits.textOutsideQuotedInlineCode.source],
    ['같은 inline literal의 soft newline', ...meaningPreservingEdits.quotedInlineCodeLineEnding.source],
    ['같은 fenced literal과 marker', '> ```\n> left  right\n> ```', '>```\n>left  right\n>```'],
    ['같은 hard break 표현', '> 소개  \n> 주의', '> 소개\\\n> 주의'],
    ['같은 목록과 marker', '> - 소개\n> - 주의', '>- 소개\n>- 주의'],
    ['같은 HTML pre literal과 marker', '> <pre>\n> > 소개\n> </pre>', '><pre>\n>> 소개\n></pre>'],
  ])('%s는 같은 인용 계층·본문·literal의 search-only 의미다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it('인용 본문의 entity는 파싱된 text를 한 번만 해석하고 HTML 구조로 바꾸지 않는다', () => {
    expect(JSON.parse(translationMeaning('> &lt;note&gt; &amp;amp;'))).toEqual([
      '<blockquote[]><p[]><note> &amp;</p></blockquote>',
      [],
    ]);
  });

  it.each([
    ['inline', '`> 소개`'],
    ['fenced', '```\n> 소개\n> 주의\n```'],
    ['indented', '    > 소개\n    > 주의'],
    ['HTML pre', '<pre>\n\n> 소개\n> 주의\n\n</pre>'],
    ['HTML code', '<code>\n\n> 소개\n> 주의\n\n</code>'],
  ])('%s code의 인용 표기는 구조가 아닌 literal로 남는다', (_kind, source) => {
    const [meaning] = JSON.parse(translationMeaning(source)) as [string, string[]];
    expect(meaning).not.toContain('<blockquote');
    expect(translationMeaning(source)).not.toBe(translationMeaning(source.replace('> 소개', '>> 소개')));
  });
});

describe('translationMeaning Markdown 명시 줄바꿈', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['two-space', '소개  \n주의'],
    ['backslash', '소개\\\n주의'],
  ])('%s hard break 추가는 soft newline과 다른 의미다', (_notation, hard) => {
    expect(translationMeaning(hard)).not.toBe(translationMeaning('소개\n주의'));
    expect(translationMeaning('소개\n주의')).not.toBe(translationMeaning(hard));
    expect(translationMeaning(hard)).not.toBe(translationMeaning('소개 주의'));
  });

  it('같은 문단 안 hard break 위치 이동은 의미 변경이다', () => {
    expect(translationMeaning('소개  \n주의\n조건')).not.toBe(translationMeaning('소개\n주의  \n조건'));
  });

  it.each([
    [
      'two-space',
      '소개  \n주의',
      [{ type: 'text', value: '소개' }, { type: 'break' }, { type: 'text', value: '주의' }],
    ],
    [
      'backslash',
      '소개\\\n주의',
      [{ type: 'text', value: '소개' }, { type: 'break' }, { type: 'text', value: '주의' }],
    ],
    ['soft newline', '소개\n주의', [{ type: 'text', value: '소개\n주의' }]],
  ])('%s 입력은 remark 문단 안 실제 break 노드 또는 단일 text로 파싱된다', (_kind, source, expected) => {
    expect(markdown.parse(source)).toMatchObject({
      type: 'root',
      children: [{ type: 'paragraph', children: expected }],
    });
  });

  it.each([
    ['two-space와 backslash 표현', ...meaningPreservingEdits.hardBreakNotation.source],
    ['HTML br와 Markdown hard break 표현', '<p>소개<br>주의</p>', '소개  \n주의'],
    ['목록 항목 안 같은 hard break', ...meaningPreservingEdits.listHardBreakNotation.source],
  ])('%s는 같은 break 구조의 search-only 의미를 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['HTML br 제거', '<p>소개<br>주의</p>', '<p>소개 주의</p>'],
    ['fenced code 안 two-space 표기', '본문\n\n```\na  \nb\n```', '본문\n\n```\na\\\nb\n```'],
    [
      'fenced code 앞 문단의 hard break 추가',
      '본문\n조건\n\n```\nleft\nright\n```',
      '본문  \n조건\n\n```\nleft\nright\n```',
    ],
    ['HTML code 안 two-space 표기와 soft newline', '본문 <code>a  \nb</code>', '본문 <code>a\nb</code>'],
    ['HTML code 안 hard break 표기 제거', '본문 <code>a\\\nb</code>', '본문 <code>a\nb</code>'],
    ['HTML pre 안 two-space 표기와 soft newline', '<pre>a  \nb</pre>', '<pre>a\nb</pre>'],
  ])('%s는 기존 code/literal·HTML br 계약을 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown autolink', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['URL 경로', ...meaningChanges.autolinkPath.source],
    ['이메일 주소', ...meaningChanges.autolinkEmail.source],
    ['같은 목적지의 표시 내용', '소개 <contact@example.com>', '소개 <mailto:contact@example.com>'],
    ['목록 항목 안 URL', '- 소개 <https://example.com/a>', '- 소개 <https://example.com/b>'],
    ['URL 안 literal entity', '소개 <https://example.com/a?x=1&y=2>', '소개 <https://example.com/a?x=1&amp;y=2>'],
  ])('%s 변경은 목적지 또는 표시 내용의 의미 변경이다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['https://example.com/b', 'https://example.com/b'],
    ['contact@example.com', 'mailto:contact@example.com'],
  ])('<%s>의 remark 목적지와 표시 내용이 HTML 비교까지 남는다', (display, destination) => {
    expect(markdown.parse(`소개 <${display}>`)).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '소개 ' },
            { type: 'link', url: destination, children: [{ type: 'text', value: display }] },
          ],
        },
      ],
    });
    expect(JSON.parse(translationMeaning(`소개 <${display}>`))).toEqual([
      `<p[]>소개 <a[{"name":"href","value":"${destination}"}]>${display}</a></p>`,
      [],
    ]);
  });

  it('autolink의 literal entity와 따옴표를 목적지와 표시 내용 양쪽에 보존한다', () => {
    expect(JSON.parse(translationMeaning('소개 <https://example.com/a?x="1"&amp;y=2>'))).toEqual([
      '<p[]>소개 <a[{"name":"href","value":"https://example.com/a?x=\\"1\\"&amp;y=2"}]>https://example.com/a?x="1"&amp;y=2</a></p>',
      [],
    ]);
  });

  it.each([
    ['주변 표시용 공백', ...meaningPreservingEdits.autolinkDisplaySpacing.source],
    ['soft newline', ...meaningPreservingEdits.autolinkSoftNewline.source],
    [
      '같은 목적지·표시 내용의 HTML 앵커',
      '소개 <https://example.com/a>',
      '소개 <a href="https://example.com/a">https://example.com/a</a>',
    ],
  ])('%s는 같은 autolink의 search-only 의미를 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['inline code literal', '본문 `<https://example.com/a>`', '본문 `<https://example.com/b>`'],
    ['fenced code literal', '```\n<https://example.com/a>\n```', '```\n<https://example.com/b>\n```'],
    ['indented code literal', '    <https://example.com/a>', '    <https://example.com/b>'],
    [
      'HTML code 안 표기와 실제 앵커',
      '본문 <code><https://example.com/a></code>',
      '본문 <code><a href="https://example.com/a">https://example.com/a</a></code>',
    ],
    [
      'HTML pre 안 표기와 실제 앵커',
      '<pre><https://example.com/a></pre>',
      '<pre><a href="https://example.com/a">https://example.com/a</a></pre>',
    ],
    [
      '기존 inline 링크 원시 표기',
      '소개 [소개](https://example.com/a)',
      '소개 <a href="https://example.com/a">소개</a>',
    ],
  ])('%s는 기존 literal·비-autolink 계약을 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown 링크·이미지 angle 목적지', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['같은 표시 내용의 링크 경로', '소개 [안내](<https://example.com/old>)', '소개 [안내](<https://example.com/new>)'],
    ['같은 alt의 이미지 경로', '![대체](<https://example.com/old.png>)', '![대체](<https://example.com/new.png>)'],
    ['목록 안 링크 경로', '- [안내](<https://example.com/old>)', '- [안내](<https://example.com/new>)'],
    ['같은 목적지의 표시 내용', '[안내](<https://example.com/a>)', '[주의](<https://example.com/a>)'],
    ['같은 목적지의 alt', '![대체](<https://example.com/a.png>)', '![조건](<https://example.com/a.png>)'],
    [
      '한 번만 해석해야 하는 entity 목적지',
      '[안내](<https://example.com/a?x=1&amp;y=2>)',
      '[안내](<https://example.com/a?x=1&amp;amp;y=2>)',
    ],
    ['escape된 목적지', '[안내](<https://example.com/a\\>old>)', '[안내](<https://example.com/a\\>new>)'],
    ['목적지 안 의미 공백', '[안내](<https://example.com/a b>)', '[안내](<https://example.com/a  b>)'],
    [
      '이미지 title 안 괄호',
      '![대체](<https://example.com/old.png> "제목](x)")',
      '![대체](<https://example.com/new.png> "제목](x)")',
    ],
    [
      '이미지 alt 안 link',
      '![대체 [안내](<https://example.com/docs>)](<https://example.com/old.png>)',
      '![대체 [안내](<https://example.com/docs>)](<https://example.com/new.png>)',
    ],
    ['label 안 code bracket', '[`]`](<https://example.com/old>)', '[`]`](<https://example.com/new>)'],
    ['label 안 hard break', '[안내  \n주의](<https://example.com/a>)', '[안내\n주의](<https://example.com/a>)'],
    ['label 안 code literal', '[`left  right`](<https://example.com/a>)', '[`left right`](<https://example.com/a>)'],
  ])('%s 변경을 autolink 전용 분기로 합치지 않는다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it('remark의 링크 URL·표시 내용과 이미지 URL·alt가 최종 비교에 남는다', () => {
    expect(markdown.parse('[안내](<https://example.com/old>) ![대체](<https://example.com/old.png>)')).toMatchObject({
      children: [
        {
          children: [
            { type: 'link', url: 'https://example.com/old', children: [{ type: 'text', value: '안내' }] },
            { type: 'text', value: ' ' },
            { type: 'image', url: 'https://example.com/old.png', alt: '대체' },
          ],
        },
      ],
    });
    expect(JSON.parse(translationMeaning('[안내](<https://example.com/old>)'))).toEqual([
      '<p[]>[안내](<a[{"name":"href","value":"https://example.com/old"}]></a>)</p>',
      [],
    ]);
    expect(JSON.parse(translationMeaning('![대체](<https://example.com/old.png>)'))).toEqual([
      '<p[]>![대체](<img[{"name":"alt","value":"대체"},{"name":"src","value":"https://example.com/old.png"}]></img>)</p>',
      [],
    ]);
  });

  it('entity·escape를 remark에서 한 번 해석한 URL 그대로 비교한다', () => {
    const source = '[안내](<https://example.com/a\\>b?x="1"&amp;amp;y=2>)';
    expect(markdown.parse(source)).toMatchObject({
      children: [
        {
          children: [{ type: 'link', url: 'https://example.com/a>b?x="1"&amp;y=2', children: [{ value: '안내' }] }],
        },
      ],
    });
    expect(JSON.parse(translationMeaning(source))).toEqual([
      '<p[]>[안내](<a[{"name":"href","value":"https://example.com/a>b?x=\\"1\\"&amp;y=2"}]></a>)</p>',
      [],
    ]);
  });

  it.each([
    [
      '링크 주변 표시용 공백',
      '소개  [안내](<https://example.com/a>)  주의',
      '소개 [안내](<https://example.com/a>) 주의',
    ],
    ['링크 앞 soft newline', '소개\n[안내](<https://example.com/a>)', '소개 [안내](<https://example.com/a>)'],
    ['이미지 앞 soft newline', ...meaningPreservingEdits.imageDestinationSoftNewline.source],
    [
      '동일 URL의 entity 표기',
      '[안내](<https://example.com/a?x=1&y=2>)',
      '[안내](<https://example.com/a?x=1&amp;y=2>)',
    ],
  ])('%s는 같은 목적지·표시 내용/alt의 search-only이다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['inline code', '`[안내](<https://example.com/a>)`', '`[안내](<https://example.com/b>)`'],
    ['fenced code', '```\n![대체](<https://example.com/a>)\n```', '```\n![대체](<https://example.com/b>)\n```'],
    ['indented code', '    [안내](<https://example.com/a>)', '    [안내](<https://example.com/b>)'],
    [
      'HTML code literal',
      '본문 <code>[안내](<https://example.com/a>)</code>',
      '본문 <code>[안내](<a href="https://example.com/a"></a>)</code>',
    ],
    [
      'HTML pre literal',
      '<pre>![대체](<https://example.com/a>)</pre>',
      '<pre>![대체](<img src="https://example.com/a" alt="대체">)</pre>',
    ],
    ['bare 목적지 링크', '[안내](https://example.com/a)', '[안내](https://example.com/b)'],
  ])('기존 %s 의미를 보존한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });
});

describe('translationMeaning escaped HTML 표기', () => {
  it.each([
    ['escaped code', '\\<code> [안내](<https://example.com/old>) \\</code>'],
    ['escaped pre', '\\<pre> [안내](<https://example.com/old>) \\</pre>'],
    ['여는 code만 escape', '\\<code> [안내](<https://example.com/old>) </code>'],
    ['여는 pre만 escape', '\\<pre> [안내](<https://example.com/old>) </pre>'],
    ['홀수 backslash', '\\\\\\<code> [안내](<https://example.com/old>) \\\\\\</code>'],
    ['escaped code 안 이미지', '\\<code> ![대체](<https://example.com/old.png>) \\</code>'],
    ['escaped pre 안 autolink', '\\<pre> <https://example.com/old> \\</pre>'],
    ['escaped code 안 full 참조', '\\<code> [안내][d] \\</code>\n\n[d]: <https://example.com/old>'],
    ['escaped pre 안 참조 이미지', '\\<pre> ![대체][] \\</pre>\n\n[대체]: <https://example.com/old.png>'],
    ['escaped code 안 shortcut 참조', '\\<code> [안내] \\</code>\n\n[안내]: <https://example.com/old>'],
    [
      '실제 HTML code와 escaped code 혼합',
      '<code>고정 [literal](<https://example.com/fixed>)</code>\n\n\\<code> [안내](<https://example.com/old>) \\</code>',
    ],
    ['Markdown code의 HTML 표기 뒤 escaped pre', '`<code>`\n\n\\<pre> [안내](<https://example.com/old>) \\</pre>'],
  ])('%s 안 실제 목적지 변경은 최종 HTML 비교에 남는다', (_kind, source) => {
    const changed = source.replace('/old', '/new');
    expect(translationMeaning(source)).not.toBe(translationMeaning(changed));
    const meaning = JSON.parse(translationMeaning(source))[0] as string;
    expect(meaning).toContain('"value":"https://example.com/old');
  });

  it('escaped 태그는 문자로, 그 사이 링크는 독립 목적지로 보존한다', () => {
    expect(JSON.parse(translationMeaning('\\<code> [안내](<https://example.com/old>) \\</code>'))).toEqual([
      '<p[]><code> [안내](<a[{"name":"href","value":"https://example.com/old"}]></a>) </code></p>',
      [],
    ]);
  });

  it.each([
    ['code의 표시용 공백', ...meaningPreservingEdits.escapedCodeLinkSpacing.source],
    [
      'pre의 soft newline',
      '\\<pre>\n[안내](<https://example.com/a>) \\</pre>',
      '\\<pre> [안내](<https://example.com/a>) \\</pre>',
    ],
    [
      '이미지 앞 soft newline',
      '\\<code>\n![대체](<https://example.com/a.png>) \\</code>',
      '\\<code> ![대체](<https://example.com/a.png>) \\</code>',
    ],
    ['참조 앞 soft newline', ...meaningPreservingEdits.escapedCodeReferenceSoftNewline.source],
  ])('%s는 같은 실제 링크 의미를 유지한다', (_kind, source, equivalent) => {
    expect(translationMeaning(source)).toBe(translationMeaning(equivalent));
  });

  it.each([
    ['실제 code', '<code> [안내](<https://example.com/old>) </code>'],
    ['실제 pre', '<pre> [안내](<https://example.com/old>) </pre>'],
    ['닫는 code만 escape', '<code> [안내](<https://example.com/old>) \\</code>'],
    ['닫는 pre만 escape', '<pre> [안내](<https://example.com/old>) \\</pre>'],
    ['짝수 backslash의 실제 code', '\\\\<code> [안내](<https://example.com/old>) \\\\</code>'],
    ['Markdown inline code', '`\\<code> [안내](<https://example.com/old>) \\</code>`'],
    ['Markdown fenced code', '```\n\\<code> [안내](<https://example.com/old>) \\</code>\n```'],
    ['Markdown indented code', '    \\<code> [안내](<https://example.com/old>) \\</code>'],
  ])('%s 안 표기는 실제 링크로 재해석하지 않는다', (_kind, source) => {
    expect(JSON.parse(translationMeaning(source))[0]).not.toContain('"name":"href"');
  });

  it.each([
    [
      '표시 내용',
      '\\<code> [안내](<https://example.com/a>) \\</code>',
      '\\<code> [주의](<https://example.com/a>) \\</code>',
    ],
    [
      'alt',
      '\\<code> ![대체](<https://example.com/a.png>) \\</code>',
      '\\<code> ![조건](<https://example.com/a.png>) \\</code>',
    ],
    ['문단 구조', '\\<code> 안내\n\n주의 \\</code>', '\\<code> 안내 주의 \\</code>'],
    ['실제 HTML literal 공백', '<code>left  right</code>', '<code>left right</code>'],
  ])('%s 변경은 계속 구분한다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });
});

describe('translationMeaning Markdown 참조형 목적지', () => {
  const markdown = unified().use(remarkParse);

  it.each([
    ['full 링크', '[안내][d]', 'd'],
    ['collapsed 링크', '[안내][]', '안내'],
    ['shortcut 링크', '[안내]', '안내'],
    ['full 이미지', '![대체][d]', 'd'],
    ['collapsed 이미지', '![대체][]', '대체'],
    ['shortcut 이미지', '![대체]', '대체'],
  ])('%s의 같은 표시 내용/alt와 다른 정의 URL을 구분한다', (_kind, reference, identifier) => {
    const before = `${reference}\n\n[${identifier}]: <https://example.com/old>`;
    const after = `${reference}\n\n[${identifier}]: <https://example.com/new>`;
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['full 링크', '[안내][D]', 'linkReference', 'full', 'd', '안내'],
    ['collapsed 링크', '[안내][]', 'linkReference', 'collapsed', '안내', '안내'],
    ['shortcut 링크', '[안내]', 'linkReference', 'shortcut', '안내', '안내'],
    ['full 이미지', '![대체][D]', 'imageReference', 'full', 'd', '대체'],
    ['collapsed 이미지', '![대체][]', 'imageReference', 'collapsed', '대체', '대체'],
    ['shortcut 이미지', '![대체]', 'imageReference', 'shortcut', '대체', '대체'],
  ])(
    '%s의 remark 정의·참조와 최종 실제 URL·표시 내용/alt를 보존한다',
    (_kind, reference, type, referenceType, identifier, label) => {
      const source = `${reference}\n\n[${identifier}]: <https://example.com/a\\>b?x="1"&amp;amp;y=2>`;
      const image = type === 'imageReference';
      expect(markdown.parse(source)).toMatchObject({
        children: [
          {
            children: [
              {
                type,
                referenceType,
                identifier,
                ...(image ? { alt: label } : { children: [{ type: 'text', value: label }] }),
              },
            ],
          },
          { type: 'definition', identifier, url: 'https://example.com/a>b?x="1"&amp;y=2' },
        ],
      });
      // Literal expectations are independent of the comparator's URL serialization.
      const [meaning] = JSON.parse(translationMeaning(source)) as [string, string[]];
      expect(meaning).toContain(
        image
          ? '<img[{"name":"alt","value":"대체"},{"name":"src","value":"https://example.com/a>b?x=\\"1\\"&amp;y=2"}]></img>'
          : '<a[{"name":"href","value":"https://example.com/a>b?x=\\"1\\"&amp;y=2"}]></a>'
      );
      expect(meaning).toContain(label);
    }
  );

  it.each([
    [
      '링크 entity 재해석',
      '[안내][d]\n\n[d]: <https://example.com/a?x=1&amp;y=2>',
      '[안내][d]\n\n[d]: <https://example.com/a?x=1&amp;amp;y=2>',
    ],
    [
      '이미지 escape 목적지',
      '![대체][d]\n\n[d]: <https://example.com/a\\>old>',
      '![대체][d]\n\n[d]: <https://example.com/a\\>new>',
    ],
    ['URL 내부 공백', '[안내][d]\n\n[d]: <https://example.com/a b>', '[안내][d]\n\n[d]: <https://example.com/a  b>'],
    [
      '같은 URL의 링크 표시 내용',
      '[안내][d]\n\n[d]: <https://example.com/a>',
      '[주의][d]\n\n[d]: <https://example.com/a>',
    ],
    [
      '같은 URL의 이미지 alt',
      '![대체][d]\n\n[d]: <https://example.com/a>',
      '![조건][d]\n\n[d]: <https://example.com/a>',
    ],
    [
      'label 안 code literal',
      '[`left  right`][d]\n\n[d]: <https://example.com/a>',
      '[`left right`][d]\n\n[d]: <https://example.com/a>',
    ],
    [
      'label 안 hard break',
      '[안내  \n주의][d]\n\n[d]: <https://example.com/a>',
      '[안내\n주의][d]\n\n[d]: <https://example.com/a>',
    ],
  ])('%s를 inline link/image 전용 처리로 합치지 않는다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    [
      '링크 주변 표시용 공백',
      '소개  [안내][d]  주의\n\n[d]: <https://example.com/a>',
      '소개 [안내][d] 주의\n\n[d]: <https://example.com/a>',
    ],
    [
      '이미지 앞 soft newline',
      '소개\n![대체][d]\n\n[d]: <https://example.com/a.png>',
      '소개 ![대체][d]\n\n[d]: <https://example.com/a.png>',
    ],
    [
      'collapsed 링크 앞 soft newline',
      '소개\n[안내][]\n\n[안내]: <https://example.com/a>',
      '소개 [안내][]\n\n[안내]: <https://example.com/a>',
    ],
    [
      'shortcut 이미지 주변 공백',
      '소개  ![대체]  주의\n\n[대체]: <https://example.com/a>',
      '소개 ![대체] 주의\n\n[대체]: <https://example.com/a>',
    ],
    [
      '같은 정의의 entity 표기',
      '[안내][d]\n\n[d]: <https://example.com/a?x=1&y=2>',
      '[안내][d]\n\n[d]: <https://example.com/a?x=1&amp;y=2>',
    ],
    [
      '중복 정의의 뒤 URL은 사용하지 않음',
      '[안내][d]\n\n[d]: <https://example.com/first>\n[d]: <https://example.com/unused>',
      '[안내][d]\n\n[d]: <https://example.com/first>\n[d]: <https://example.com/ignored>',
    ],
  ])('%s는 같은 실제 URL·표시 내용/alt의 search-only이다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });

  it.each([
    ['inline code', '`[안내][d]`\n\n[d]: <https://example.com/a>'],
    ['fenced code', '```\n![대체][d]\n\n[d]: <https://example.com/a>\n```'],
    ['indented code', '    [안내][d]\n\n    [d]: <https://example.com/a>'],
    ['HTML code', '<code>[안내][d]</code>\n\n[d]: <https://example.com/a>'],
    ['HTML pre', '<pre>![대체][d]</pre>\n\n[d]: <https://example.com/a>'],
  ])('%s 안 참조/정의 표기를 링크로 재해석하지 않는다', (_kind, source) => {
    const [meaning] = JSON.parse(translationMeaning(source)) as [string, string[]];
    expect(meaning).not.toContain('"name":"href"');
    expect(meaning).not.toContain('"name":"src"');
  });

  it('remark가 정규화한 identifier와 첫 정의의 실제 URL을 사용한다', () => {
    const source =
      '[안내][Mixed  ID]\n\n[mixed id]: <https://example.com/first>\n[MIXED ID]: <https://example.com/second>';
    expect(markdown.parse(source)).toMatchObject({
      children: [
        { children: [{ type: 'linkReference', identifier: 'mixed id' }] },
        { type: 'definition', identifier: 'mixed id', url: 'https://example.com/first' },
        { type: 'definition', identifier: 'mixed id', url: 'https://example.com/second' },
      ],
    });
    const [meaning] = JSON.parse(translationMeaning(source)) as [string, string[]];
    expect(meaning).toContain('<a[{"name":"href","value":"https://example.com/first"}]></a>');
    expect(meaning).not.toContain('"value":"https://example.com/second"');
  });
});

describe('translationMeaning Markdown 목록 계층', () => {
  const nestedDot = '3. 소개\n\n   7. 주의';
  const nestedParenthesis = '03) 소개\n\n    07) 주의';
  const paragraphDot = '3. 소개\n   7. 주의';
  const paragraphParenthesis = '03) 소개\n    07) 주의';
  const markdown = unified().use(remarkParse);

  it.each([
    ['dot', nestedDot],
    ['parenthesis', nestedParenthesis],
  ])('%s 동등 fixture는 시작 번호 3 아래 시작 번호 7의 실제 중첩 목록이다', (_delimiter, source) => {
    expect(markdown.parse(source)).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'list',
          ordered: true,
          start: 3,
          children: [
            {
              type: 'listItem',
              children: [
                { type: 'paragraph', children: [{ type: 'text', value: '소개' }] },
                {
                  type: 'list',
                  ordered: true,
                  start: 7,
                  children: [
                    {
                      type: 'listItem',
                      children: [{ type: 'paragraph', children: [{ type: 'text', value: '주의' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it.each([
    [paragraphDot, '소개\n7. 주의'],
    [paragraphParenthesis, '소개\n07) 주의'],
  ])('빈 줄 없는 %s의 두 번째 줄은 중첩 목록이 아니라 문단 literal이다', (source, literal) => {
    expect(markdown.parse(source)).toMatchObject({
      type: 'root',
      children: [
        {
          type: 'list',
          ordered: true,
          start: 3,
          children: [
            {
              type: 'listItem',
              children: [{ type: 'paragraph', children: [{ type: 'text', value: literal }] }],
            },
          ],
        },
      ],
    });
  });

  it.each([
    ['비순서 목록 평탄화', ...meaningChanges.unorderedListFlattening.source],
    ['비순서 목록 중첩', ...meaningChanges.unorderedListNesting.source],
    ['순서 목록 평탄화', ...meaningChanges.orderedListFlattening.source],
    ['순서 목록 중첩', ...meaningChanges.orderedListNesting.source],
    ['목록 종류', '- 소개\n- 주의', '1. 소개\n2. 주의'],
    ['중첩 목록 종류', ...meaningChanges.nestedListKind.source],
    ['중첩 목록 시작 번호', ...meaningChanges.nestedListStart.source],
    ['같은 깊이의 부모 항목 이동', ...meaningChanges.listParentMovement.source],
    ['목록 inline literal 공백', '- 소개\n  - `left  right`', '- 소개\n  - `left right`'],
    ['빈 줄 없이 문단에 남은 숫자와 구두점 literal', ...meaningChanges.listParagraphLiteral.source],
    [
      'HTML code 안 목록처럼 보이는 literal 들여쓰기',
      '소개 <code>\n- 주의\n  - 조건\n</code>',
      '소개 <code>\n- 주의\n- 조건\n</code>',
    ],
  ])('%s는 문서 구조 또는 literal 의미 변경이다', (_kind, before, after) => {
    expect(translationMeaning(before)).not.toBe(translationMeaning(after));
  });

  it.each([
    ['비순서 marker', ...meaningPreservingEdits.unorderedListMarkers.source],
    ['같은 계층의 들여쓰기', '- 소개\n  - 주의', ' - 소개\n    - 주의'],
    ['같은 계층의 본문 공백', '- 소개  조건\n  - 주의', '- 소개 조건\n  - 주의'],
    ['목록 항목의 soft newline', '- 소개\n  조건\n  - 주의', '- 소개 조건\n  - 주의'],
    ['같은 항목의 빈 줄', ...meaningPreservingEdits.listItemBlankLines.source],
    ['빈 목록 항목 marker', '-\n- 주의', '*\n* 주의'],
    ['같은 시작 번호의 delimiter', '3. 소개\n4. 주의', '03) 소개\n04) 주의'],
    ['같은 실제 후속 번호', '3. 소개\n9. 주의', '3. 소개\n4. 주의'],
    ['중첩 순서 목록의 delimiter와 들여쓰기', ...meaningPreservingEdits.nestedOrderedListDelimiters.source],
    ['같은 inline literal의 delimiter와 목록 marker', ...meaningPreservingEdits.listInlineCodeDelimiters.source],
    [
      'HTML code 안 목록 literal의 presentation wrapper',
      '소개 <code>\n- 주의\n  - 조건\n</code>',
      '소개 <code><span>\n- 주의\n  - 조건\n</span></code>',
    ],
  ])('%s는 같은 계층·번호·literal의 search-only 의미를 유지한다', (_kind, before, after) => {
    expect(translationMeaning(before)).toBe(translationMeaning(after));
  });
});
