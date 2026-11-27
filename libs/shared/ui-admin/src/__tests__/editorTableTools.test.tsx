import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Editor as CoreEditor } from '@tiptap/core';
import { cellAround } from '@tiptap/pm/tables';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../Editor/Editor';

vi.mock('@darun/utils-image-upload', () => ({
  useImageUpload: () => ({ upload: vi.fn() }),
}));
afterEach(cleanup);

async function openEditor(value = '', onChange = vi.fn()) {
  const view = render(<Editor defaultValue={value} onChange={onChange} />);
  const toggle = (await screen.findByRole('button', {
    name: '표 도구',
  })) as HTMLButtonElement;
  const element = view.container.querySelector<HTMLElement & { editor: CoreEditor }>('.ProseMirror')!;
  vi.spyOn(element.editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  fireEvent.click(toggle);
  return { ...view, element, core: element.editor, onChange };
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function selectCell(core: CoreEditor, text: string) {
  let position: number | undefined;
  core.state.doc.descendants((node, pos) => {
    if (position === undefined && node.type.name === 'paragraph' && node.textContent === text) position = pos + 1;
  });
  const selectionPosition = position;
  if (selectionPosition === undefined) throw new Error(`Missing cell or paragraph: ${text}`);
  act(() => void core.commands.setTextSelection(selectionPosition));
}

function cells(body: ParentNode) {
  return [...body.querySelectorAll('tr')].map(row => [...row.cells].map(cell => `${cell.tagName}:${cell.textContent}`));
}

describe('본문 표 도구', () => {
  it('빈 본문에서 지정한 행과 열의 머리글 표를 만들고 셀과 함께 다시 연다', async () => {
    const { core, unmount, onChange } = await openEditor();
    fireEvent.change(screen.getByLabelText('열 수'), {
      target: { value: '3' },
    });
    click('표 삽입');
    core.commands.insertContent('플랜');
    core.commands.goToNextCell();
    core.commands.insertContent('월간');
    const saved = onChange.mock.lastCall?.[0];
    unmount();

    const reopened = render(<Editor value={saved} />);
    await waitFor(() =>
      expect(cells(reopened.container)).toEqual([
        ['TH:플랜', 'TH:월간', 'TH:'],
        ['TD:', 'TD:', 'TD:'],
      ])
    );
  });

  it('유효하지 않은 크기와 이미 문서 한도에 도달한 표 추가는 본문을 바꾸지 않는다', async () => {
    const existing = '<p>초안</p><table>' + '<tr><td colspan="400">A</td></tr>'.repeat(250) + '</table>';
    const { core, onChange } = await openEditor(existing);
    selectCell(core, '초안');
    const before = core.getHTML();
    fireEvent.change(screen.getByLabelText('열 수'), {
      target: { value: '1001' },
    });
    click('표 삽입');
    expect(screen.getByRole('alert').textContent).toContain('편집 가능한 범위');
    fireEvent.change(screen.getByLabelText('열 수'), {
      target: { value: '3' },
    });
    click('표 삽입');
    expect(screen.getByRole('alert').textContent).toContain('편집 가능한 범위');
    expect(core.getHTML()).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
    selectCell(core, 'A');
    expect(
      (
        await screen.findByRole<HTMLButtonElement>('button', {
          name: '아래에 행 추가',
        })
      ).disabled
    ).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '오른쪽에 열 추가' }).disabled).toBe(true);
  });

  it('가운데 셀의 위·오른쪽에 추가하고 선택한 행·열만 삭제한다', async () => {
    const content =
      '<p>표 앞</p><table><tr><td>플랜</td><td>월간</td><td>연간</td></tr>' +
      '<tr><td>Basic</td><td>1000</td><td>11000</td></tr>' +
      '<tr><td>Pro</td><td>2500</td><td>28000</td></tr></table><p>표 뒤</p>';
    const { core, element } = await openEditor(content);
    selectCell(core, '1000');
    click('위에 행 추가');
    click('오른쪽에 열 추가');
    expect(cells(element)).toEqual([
      ['TD:플랜', 'TD:월간', 'TD:', 'TD:연간'],
      ['TD:', 'TD:', 'TD:', 'TD:'],
      ['TD:Basic', 'TD:1000', 'TD:', 'TD:11000'],
      ['TD:Pro', 'TD:2500', 'TD:', 'TD:28000'],
    ]);

    click('선택한 행 삭제');
    selectCell(core, '연간');
    click('선택한 열 삭제');
    expect(cells(element)).toEqual([
      ['TD:플랜', 'TD:월간', 'TD:'],
      ['TD:', 'TD:', 'TD:'],
      ['TD:Pro', 'TD:2500', 'TD:'],
    ]);

    selectCell(core, '2500');
    click('표 삭제');
    expect(element.querySelector('table')).toBeNull();
    expect([...element.querySelectorAll('p')].map(p => p.textContent)).toEqual(['표 앞', '표 뒤']);
  });

  it('첫 행과 첫 열을 전환하면서 다른 축의 머리글과 병합된 셀의 내용을 보존한다', async () => {
    const { core, element } = await openEditor(
      '<table><tr><td>플랜</td><td colspan="2">가격</td></tr>' +
        '<tr><td rowspan="2">Basic</td><td>월간</td><td>연간</td></tr>' +
        '<tr><td>1000</td><td>11000</td></tr></table>'
    );
    selectCell(core, '가격');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '선택한 열 삭제' }).disabled).toBe(true);
    act(() => void core.commands.setCellSelection({ anchorCell: cellAround(core.state.selection.$head)!.pos }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '선택한 열 삭제' }).disabled).toBe(true);
    selectCell(core, 'Basic');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '선택한 행 삭제' }).disabled).toBe(true);
    act(() => void core.commands.setCellSelection({ anchorCell: cellAround(core.state.selection.$head)!.pos }));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '선택한 행 삭제' }).disabled).toBe(true);
    selectCell(core, '11000');
    click('첫 행 머리글');
    click('첫 열 머리글');
    expect(cells(element)).toEqual([
      ['TH:플랜', 'TH:가격'],
      ['TH:Basic', 'TD:월간', 'TD:연간'],
      ['TD:1000', 'TD:11000'],
    ]);
    click('첫 행 머리글');
    expect(cells(element)[0]).toEqual(['TH:플랜', 'TD:가격']);
    expect(element.querySelector('td[colspan="2"]')?.textContent).toBe('가격');
    expect(element.querySelector('th[rowspan="2"]')?.textContent).toBe('Basic');
    selectCell(core, '월간');
    click('아래에 행 추가');
    expect(element.querySelector('th[rowspan="3"]')?.textContent).toBe('Basic');
    expect(cells(element).at(-1)).toEqual(['TD:1000', 'TD:11000']);
  });

  it('표 전체가 한 셀로 병합된 경우에도 머리글을 되돌릴 수 있다', async () => {
    const { core, element } = await openEditor(
      '<table><tr><td rowspan="2" colspan="2">공통 요금</td></tr><tr></tr></table>'
    );
    selectCell(core, '공통 요금');
    click('첫 행 머리글');
    expect(element.querySelector('th[rowspan="2"][colspan="2"]')?.textContent).toBe('공통 요금');
    click('첫 열 머리글');
    expect(element.querySelector('td[rowspan="2"][colspan="2"]')?.textContent).toBe('공통 요금');
  });

  it.each([
    ['첫 열 머리글', '<tr><td>플랜</td></tr><tr><td>가격</td></tr>'],
    ['첫 행 머리글', '<tr><td>플랜</td><td>가격</td></tr>'],
  ])('한 행이나 한 열로 된 표에서 %s을 켰다가 끄면 두 셀이 모두 되돌아온다', async (label, rows) => {
    const { core, element } = await openEditor(`<table>${rows}</table>`);
    selectCell(core, '플랜');
    click(label);
    expect([...element.querySelectorAll('th')].map(cell => cell.textContent)).toEqual(['플랜', '가격']);
    click(label);
    expect([...element.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['플랜', '가격']);
  });

  it('두 방향으로 병합된 셀 때문에 나머지 셀이 이동할 수 있는 행 편집만 거절한다', async () => {
    const { core, element, onChange } = await openEditor(
      '<p>표 앞</p><table><tr><td rowspan="2" colspan="2">왼쪽 병합</td><td>첫 행 가운데</td>' +
        '<td rowspan="2">오른쪽 병합</td></tr><tr><td>둘째 행 가운데</td></tr>' +
        '<tr><td>A</td><td>B</td><td>C</td><td>D</td></tr></table><p>표 뒤</p>'
    );
    selectCell(core, '첫 행 가운데');
    const before = core.getHTML();
    const unsafeButtons = ['아래에 행 추가', '선택한 행 삭제'];
    for (const name of unsafeButtons) {
      expect(screen.getByRole<HTMLButtonElement>('button', { name }).disabled).toBe(true);
      click(name);
    }
    selectCell(core, '둘째 행 가운데');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '위에 행 추가' }).disabled).toBe(true);
    expect(core.getHTML()).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
    click('아래에 행 추가');
    expect(cells(element)).toEqual([
      ['TD:왼쪽 병합', 'TD:첫 행 가운데', 'TD:오른쪽 병합'],
      ['TD:둘째 행 가운데'],
      ['TD:', 'TD:', 'TD:', 'TD:'],
      ['TD:A', 'TD:B', 'TD:C', 'TD:D'],
    ]);
  });

  it('표 도구를 연 직후나 표를 삽입한 뒤 Escape를 누르면 도구만 닫는다', async () => {
    const { element } = await openEditor();
    const toggle = screen.getByRole('button', { name: '표 도구' });
    fireEvent.keyDown(element, { key: 'F10', altKey: true });
    expect(document.activeElement).toBe(toggle);
    const parentEscape = vi.fn();
    document.addEventListener('keydown', parentEscape);
    try {
      fireEvent.keyDown(toggle, { key: 'Escape' });
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle);

      element.addEventListener('keydown', event => {
        if (event.key === 'Escape') event.preventDefault();
      });
      fireEvent.click(toggle);
      click('표 삽입');
      expect(document.activeElement).toBe(element);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      fireEvent.keyDown(element, { key: 'Escape' });
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(element);
      expect(parentEscape).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', parentEscape);
    }
  });
});
