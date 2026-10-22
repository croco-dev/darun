interface MeaningChangeFixture {
  readonly source: readonly [before: string, after: string];
  readonly english: readonly [before: string, after: string];
}

interface MeaningPreservingEditFixture {
  readonly source: readonly [before: string, after: string];
  readonly english?: string;
}

// 두 테스트가 같은 원문 전환을 검증하는 사례만 소유한다.
// 영어는 DB/API가 검증할 독립 리터럴이며 생산 비교 함수나 provider 출력으로 계산하지 않는다.
export const meaningChanges = {
  htmlInlineCodeSpacing: {
    source: ['<p>본문 <code>left  right</code></p>', '<p>본문 <code>left right</code></p>'],
    english: ['<p>Body <code>left  right</code></p>', '<p>Body <code>left right</code></p>'],
  },
  fencedIndentation: {
    source: [
      '본문\n\n```python\nif ready:\n    send()\nfinish()\n```',
      '본문\n\n```python\nif ready:\n    send()\n    finish()\n```',
    ],
    english: [
      'Body\n\n```python\nif ready:\n    send()\nfinish()\n```',
      'Body\n\n```python\nif ready:\n    send()\n    finish()\n```',
    ],
  },
  tildeFenceLineBreak: {
    source: ['본문\n\n~~~\nprepare() finish()\n~~~', '본문\n\n~~~\nprepare()\nfinish()\n~~~'],
    english: ['Body\n\n~~~\nprepare() finish()\n~~~', 'Body\n\n~~~\nprepare()\nfinish()\n~~~'],
  },
  fencedSpacing: {
    source: ['본문\n\n```\nleft  right\n```', '본문\n\n```\nleft right\n```'],
    english: ['Body\n\n```\nleft  right\n```', 'Body\n\n```\nleft right\n```'],
  },
  indentedIndentation: {
    source: ['본문\n\n    if ready:\n        send()\n    finish()', '본문\n\n    if ready:\n        send()\n        finish()'],
    english: ['Body\n\n    if ready:\n        send()\n    finish()', 'Body\n\n    if ready:\n        send()\n        finish()'],
  },
  indentedLineBreak: {
    source: ['본문\n\n    prepare() finish()', '본문\n\n    prepare()\n    finish()'],
    english: ['Body\n\n    prepare() finish()', 'Body\n\n    prepare()\n    finish()'],
  },
  indentedSpacing: {
    source: ['본문\n\n    left  right', '본문\n\n    left right'],
    english: ['Body\n\n    left  right', 'Body\n\n    left right'],
  },
  paragraphMerge: {
    source: ['소개\n\n주의', '소개 주의'],
    english: ['Introduction\n\nWarning', 'Introduction Warning'],
  },
  paragraphSplit: {
    source: ['소개 주의', '소개\n\n주의'],
    english: ['Introduction Warning', 'Introduction\n\nWarning'],
  },
  headingMerge: {
    source: ['# 소개\n# 주의', '# 소개 # 주의'],
    english: ['# Introduction\n# Warning', '# Introduction # Warning'],
  },
  headingSplit: {
    source: ['# 소개 # 주의', '# 소개\n# 주의'],
    english: ['# Introduction # Warning', '# Introduction\n# Warning'],
  },
  headingDepthIncrease: {
    source: ['# 소개\n# 주의', '# 소개\n## 주의'],
    english: ['# Introduction\n# Warning', '# Introduction\n## Warning'],
  },
  headingDepthDecrease: {
    source: ['# 소개\n### 주의', '# 소개\n## 주의'],
    english: ['# Introduction\n### Warning', '# Introduction\n## Warning'],
  },
  quoteMarkerMerge: {
    source: ['> 소개\n> 주의', '> 소개 > 주의'],
    english: ['> Introduction\n> Warning', '> Introduction > Warning'],
  },
  quoteMarkerSplit: {
    source: ['> 소개 > 주의', '> 소개\n> 주의'],
    english: ['> Introduction > Warning', '> Introduction\n> Warning'],
  },
  quoteAddition: {
    source: ['소개 주의', '> 소개 주의'],
    english: ['Introduction Warning', '> Introduction Warning'],
  },
  quoteRemoval: {
    source: ['> 소개 주의', '소개 주의'],
    english: ['> Introduction Warning', 'Introduction Warning'],
  },
  separateQuoteBoundary: {
    source: ['> 소개\n>\n> 주의', '> 소개\n\n> 주의'],
    english: ['> Introduction\n>\n> Warning', '> Introduction\n\n> Warning'],
  },
  quoteNestingAddition: {
    source: ['> 소개\n> 주의', '> 소개\n> > 주의'],
    english: ['> Introduction\n> Warning', '> Introduction\n> > Warning'],
  },
  quoteNestingRemoval: {
    source: ['> 소개\n> > 주의', '> 소개\n> 주의'],
    english: ['> Introduction\n> > Warning', '> Introduction\n> Warning'],
  },
  inlineCodeSpaceReduction: {
    source: ['본문 `printf \'a  b\'`', '본문 `printf \'a b\'`'],
    english: ['Body `printf \'a  b\'`', 'Body `printf \'a b\'`'],
  },
  inlineCodeSpaceIncrease: {
    source: ['본문 `printf \'a b\'`', '본문 `printf \'a  b\'`'],
    english: ['Body `printf \'a b\'`', 'Body `printf \'a  b\'`'],
  },
  unorderedListFlattening: {
    source: ['- 소개\n  - 주의', '- 소개\n- 주의'],
    english: ['- Introduction\n  - Warning', '- Introduction\n- Warning'],
  },
  unorderedListNesting: {
    source: ['- 소개\n- 주의', '- 소개\n  - 주의'],
    english: ['- Introduction\n- Warning', '- Introduction\n  - Warning'],
  },
  orderedListFlattening: {
    source: ['1. 소개\n   1. 주의', '1. 소개\n1. 주의'],
    english: ['1. Introduction\n   1. Warning', '1. Introduction\n1. Warning'],
  },
  orderedListNesting: {
    source: ['1. 소개\n1. 주의', '1. 소개\n   1. 주의'],
    english: ['1. Introduction\n1. Warning', '1. Introduction\n   1. Warning'],
  },
  nestedListKind: {
    source: ['- 소개\n  - 주의', '- 소개\n  1. 주의'],
    english: ['- Introduction\n  - Warning', '- Introduction\n  1. Warning'],
  },
  nestedListStart: {
    source: ['- 소개\n  3. 주의', '- 소개\n  7. 주의'],
    english: ['- Introduction\n  3. Warning', '- Introduction\n  7. Warning'],
  },
  listParentMovement: {
    source: ['- 소개\n  - 주의\n- 기능\n  - 조건', '- 소개\n- 주의\n  - 기능\n  - 조건'],
    english: ['- Introduction\n  - Warning\n- Feature\n  - Condition', '- Introduction\n- Warning\n  - Feature\n  - Condition'],
  },
  listParagraphLiteral: {
    source: ['3. 소개\n   7. 주의', '03) 소개\n    07) 주의'],
    english: ['3. Introduction\n   7. Warning', '03) Introduction\n    07) Warning'],
  },
  autolinkPath: {
    source: ['소개 <https://example.com/a>', '소개 <https://example.com/b>'],
    english: ['Introduction <https://example.com/a>', 'Introduction <https://example.com/b>'],
  },
  autolinkEmail: {
    source: ['소개 <contact@example.com>', '소개 <team@example.com>'],
    english: ['Introduction <contact@example.com>', 'Introduction <team@example.com>'],
  },
} as const satisfies Record<string, MeaningChangeFixture>;

export const meaningPreservingEdits = {
  textOutsideHtmlCode: {
    source: ['<p>  본문  <code> left  right </code>  조건  </p>', '<p>본문 <code> left  right </code> 조건</p>'],
  },
  markdownSoftNewline: {
    source: ['본문\n조건', '본문 조건'],
    english: 'Body\nCondition',
  },
  paragraphDisplaySpacing: {
    source: ['소개  주의', '소개 주의'],
    english: 'Introduction  Warning',
  },
  paragraphBlankLines: {
    source: ['소개\n\n주의', '소개\n\n\n주의'],
    english: 'Introduction\n\nWarning',
  },
  headingAtxToSetext: {
    source: ['# 소개\n\n## 주의', '소개\n===\n\n주의\n---'],
    english: '# Introduction\n\n## Warning',
  },
  headingSetextToAtx: {
    source: ['소개\n===\n\n주의\n---', '# 소개\n\n## 주의'],
    english: 'Introduction\n===\n\nWarning\n---',
  },
  headingClosingMarkers: {
    source: ['# 소개\n## 주의', '# 소개 ###\n## 주의 ##'],
    english: '# Introduction\n## Warning',
  },
  headingBodySpacing: {
    source: ['# 소개\n\n본문  조건\n\n## 주의', '# 소개\n\n본문 조건\n\n## 주의'],
    english: '# Introduction\n\nBody  Condition\n\n## Warning',
  },
  quoteSoftNewline: {
    source: ['> 소개\n> 주의', '> 소개 주의'],
    english: '> Introduction\n> Warning',
  },
  quoteLazyContinuation: {
    source: ['> 소개\n> 주의', '> 소개\n주의'],
    english: '> Introduction\n> Warning',
  },
  quoteDisplaySpacing: {
    source: ['> 소개  주의', '> 소개 주의'],
    english: '> Introduction  Warning',
  },
  quoteMarkerIndentation: {
    source: ['> 소개\n> 주의', '   > 소개\n   > 주의'],
    english: '> Introduction\n> Warning',
  },
  nestedQuoteMarkers: {
    source: ['> > 소개\n> > 주의', '>>소개\n>>주의'],
    english: '> > Introduction\n> > Warning',
  },
  textOutsideQuotedInlineCode: {
    source: ['> 소개  `left  right`\n> 주의', '> 소개 `left  right` 주의'],
    english: '> Introduction  `left  right`\n> Warning',
  },
  hardBreakNotation: {
    source: ['소개  \n주의', '소개\\\n주의'],
    english: 'Introduction  \nWarning',
  },
  listHardBreakNotation: {
    source: ['- 소개  \n  주의', '- 소개\\\n  주의'],
    english: '- Introduction  \n  Warning',
  },
  autolinkDisplaySpacing: {
    source: ['소개  <https://example.com/a>  주의', '소개 <https://example.com/a> 주의'],
    english: 'Introduction  <https://example.com/a>  Warning',
  },
  autolinkSoftNewline: {
    source: ['소개\n<https://example.com/a> 주의', '소개 <https://example.com/a> 주의'],
    english: 'Introduction\n<https://example.com/a> Warning',
  },
  imageDestinationSoftNewline: {
    source: ['소개\n![대체](<https://example.com/a.png>)', '소개 ![대체](<https://example.com/a.png>)'],
    english: 'Introduction\n![대체](<https://example.com/a.png>)',
  },
  escapedCodeLinkSpacing: {
    source: ['\\<code>  [안내](<https://example.com/a>)  \\</code>', '\\<code> [안내](<https://example.com/a>) \\</code>'],
    english: '\\<code>  [Guide](<https://example.com/a>)  \\</code>',
  },
  escapedCodeReferenceSoftNewline: {
    source: [
      '\\<code>\n[안내][d] \\</code>\n\n[d]: <https://example.com/a>',
      '\\<code> [안내][d] \\</code>\n\n[d]: <https://example.com/a>',
    ],
    english: '\\<code>\n[Guide][d] \\</code>\n\n[d]: <https://example.com/a>',
  },
  quotedInlineCodeLineEnding: {
    source: ['> 소개 `left\n> right`', '> 소개 `left right`'],
    english: '> Introduction `left\n> right`',
  },
  textBeforeInlineCodeNewline: {
    source: ['본문\n`printf \'a  b\'` 조건', '본문 `printf \'a  b\'` 조건'],
    english: 'Body\n`printf \'a  b\'` Condition',
  },
  textOutsideInlineCodeSpacing: {
    source: ['본문  `printf \'a  b\'`  조건', '본문 `printf \'a  b\'` 조건'],
    english: 'Body  `printf \'a  b\'`  Condition',
  },
  inlineCodeDelimiters: {
    source: ['본문 `printf \'a  b\'`', '본문 ``printf \'a  b\'``'],
    english: 'Body `printf \'a  b\'`',
  },
  unorderedListMarkers: {
    source: ['- 소개\n  - 주의', '* 소개\n  * 주의'],
    english: '- Introduction\n  - Warning',
  },
  nestedOrderedListDelimiters: {
    source: ['3. 소개\n\n   7. 주의', '03) 소개\n\n    07) 주의'],
    english: '3. Introduction\n\n   7. Warning',
  },
  listItemBlankLines: {
    source: ['- 소개\n- 주의', '- 소개\n\n- 주의'],
    english: '- Introduction\n- Warning',
  },
  listInlineCodeDelimiters: {
    source: ['- 소개\n  - `left  right`', '* 소개\n  * ``left  right``'],
    english: '- Introduction\n  - `left  right`',
  },
  defaultOrderedListStart: {
    source: ['<ol><li>본문</li><li>조건</li></ol>', '<ol start="1"><li>본문</li><li>조건</li></ol>'],
  },
} as const satisfies Record<string, MeaningPreservingEditFixture>;

// 번호 전환 표는 변경 후 영어만 검증하므로 원래 영어 기대값을 새로 추가하지 않는다.
export const orderedListItemValueChange = {
  source: [
    '<ol start="5"><li>본문</li><li value="8">조건</li><li>기능</li></ol>',
    '<ol start="5"><li>본문</li><li value="12">조건</li><li>기능</li></ol>',
  ],
  english: '<ol start="5"><li>Body</li><li value="12">Condition</li><li>Feature</li></ol>',
} as const;
