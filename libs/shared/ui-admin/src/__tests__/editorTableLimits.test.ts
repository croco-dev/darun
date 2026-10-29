import { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';
import { createAdminEditorExtensions } from '../Editor/extensions';
import { getEditorTableError } from '../Editor/tableLimits';

function table(rows: number, columns: number) {
  return `<table>${`<tr><td colspan="${columns}">가격</td></tr>`.repeat(rows)}</table>`;
}

describe('표 파싱 전 전체 격자 크기 검사', () => {
  it('정확히 1000열·100000칸은 허용하고 그 다음 행은 거절한다', () => {
    expect(getEditorTableError(table(100, 1000))).toBeNull();
    expect(getEditorTableError(table(101, 1000))).toBeTruthy();
  });

  it('각 셀이 정상 범위여도 한 행의 합산 열 수를 제한한다', () => {
    expect(getEditorTableError('<table><tr><td colspan="600">A</td><td colspan="400">B</td></tr></table>')).toBeNull();
    expect(
      getEditorTableError('<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>')
    ).toBeTruthy();
  });

  it('여러 표의 총 격자 크기도 제한한다', () => {
    expect(getEditorTableError(table(50, 1000) + table(50, 1000))).toBeNull();
    expect(getEditorTableError(table(50, 1000) + table(51, 1000))).toBeTruthy();
  });

  it('작은 HTML의 병합 셀이 만드는 거대한 격자는 편집기에 넘기지 않는다', () => {
    const html =
      `<table><tr>${'<td colspan="1000" rowspan="1000">x</td>'.repeat(80)}</tr>` + '<tr></tr>'.repeat(999) + '</table>';
    expect(getEditorTableError(html)).toBeTruthy();
  });

  it('전체 행을 병합한 표의 빈 행도 그대로 읽는다', () => {
    const editor = new Editor({
      extensions: createAdminEditorExtensions(),
      content: '<table><tr><td colspan="2" rowspan="2">공통 가격</td></tr><tr></tr></table>',
    });
    try {
      expect(getEditorTableError(editor.getHTML())).toBeNull();
      const document = new DOMParser().parseFromString(editor.getHTML(), 'text/html');
      expect(document.querySelectorAll('tr')).toHaveLength(2);
      expect(document.querySelectorAll('td')).toHaveLength(1);
      expect(document.querySelector('td')?.rowSpan).toBe(2);
    } finally {
      editor.destroy();
    }
  });

  it('직접 setContent도 렌더링 전에 거절하고 기존 초안을 유지한다', () => {
    const rejected = vi.fn();
    const editor = new Editor({ extensions: createAdminEditorExtensions(rejected), content: '<p>기존 초안</p>' });
    try {
      editor.commands.setContent('<table><tr><td colspan="600">A</td><td colspan="401">B</td></tr></table>');
      expect(editor.getHTML()).toBe('<p>기존 초안</p>');
      expect(rejected).toHaveBeenCalledOnce();
    } finally {
      editor.destroy();
    }
  });

  it('개별로 허용되는 표를 추가해도 문서 전체 한도를 넘기면 기존 초안을 유지한다', () => {
    const rejected = vi.fn();
    const editor = new Editor({ extensions: createAdminEditorExtensions(rejected), content: table(50, 1000) });
    try {
      const previous = editor.getJSON();
      editor.commands.insertContentAt(editor.state.doc.content.size, table(51, 1000));
      expect(editor.getJSON()).toEqual(previous);
      expect(rejected).toHaveBeenCalledOnce();
    } finally {
      editor.destroy();
    }
  });
});
