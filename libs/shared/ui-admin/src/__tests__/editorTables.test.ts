import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createAdminEditorExtensions } from '../Editor/extensions';

describe('설명 편집기의 기존 표 보존', () => {
  it.each([
    {
      name: '두 열 가격표',
      table:
        '<table><tr><th>플랜</th><th>가격</th></tr><tr><td>Basic</td><td>1000원</td></tr><tr><td>Pro</td><td>2500원</td></tr></table>',
      rows: [
        ['TH:플랜:1:1', 'TH:가격:1:1'],
        ['TD:Basic:1:1', 'TD:1000원:1:1'],
        ['TD:Pro:1:1', 'TD:2500원:1:1'],
      ],
    },
    {
      name: '행과 열을 병합한 가격표',
      table:
        '<table><tr><th rowspan="2">플랜</th><th colspan="2">가격</th></tr><tr><th>월간</th><th>연간</th></tr><tr><td>Basic</td><td>1000원</td><td>11000원</td></tr><tr><td>Pro</td><td>2500원</td><td>28000원</td></tr></table>',
      rows: [
        ['TH:플랜:2:1', 'TH:가격:1:2'],
        ['TH:월간:1:1', 'TH:연간:1:1'],
        ['TD:Basic:1:1', 'TD:1000원:1:1', 'TD:11000원:1:1'],
        ['TD:Pro:1:1', 'TD:2500원:1:1', 'TD:28000원:1:1'],
      ],
    },
    {
      name: '본문 셀의 행과 열을 병합한 가격표',
      table:
        '<table><tr><th>플랜</th><th>월간</th><th>연간</th></tr><tr><td rowspan="2">Basic</td><td colspan="2">무료 체험 후 결제</td></tr><tr><td>1000원</td><td>11000원</td></tr></table>',
      rows: [
        ['TH:플랜:1:1', 'TH:월간:1:1', 'TH:연간:1:1'],
        ['TD:Basic:2:1', 'TD:무료 체험 후 결제:1:2'],
        ['TD:1000원:1:1', 'TD:11000원:1:1'],
      ],
    },
  ])('$name 바깥의 문장을 수정한 뒤 다시 열어도 셀 대응이 유지된다', ({ table, rows }) => {
    const editor = new Editor({
      extensions: createAdminEditorExtensions(),
      content: `<p>기존 소개</p>${table}<p>마지막 문장</p>`,
    });
    let reopened: Editor | undefined;
    try {
      editor.commands.insertContentAt(1, '수정된 ');
      reopened = new Editor({
        extensions: createAdminEditorExtensions(),
        content: editor.getHTML(),
      });
      const document = new DOMParser().parseFromString(reopened.getHTML(), 'text/html');
      expect(document.querySelector('p')?.textContent).toBe('수정된 기존 소개');
      expect(document.querySelectorAll('table')).toHaveLength(1);
      expect(
        [...document.querySelectorAll('tr')].map(row =>
          [...row.cells].map(cell => `${cell.tagName}:${cell.textContent}:${cell.rowSpan}:${cell.colSpan}`)
        )
      ).toEqual(rows);
      expect(document.body.lastElementChild?.textContent).toBe('마지막 문장');
    } finally {
      reopened?.destroy();
      editor.destroy();
    }
  });
});
