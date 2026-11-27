import { type EditorState, TextSelection } from '@tiptap/pm/state';
import {
  CellSelection,
  columnIsHeader,
  findTable,
  isInTable,
  rowIsHeader,
  selectedRect,
  TableMap,
  toggleHeader,
} from '@tiptap/pm/tables';
import { type Editor, useEditorState } from '@tiptap/react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { MenuItem, menuItemVariants } from './MenuItem';
import { getEditorDocumentTableError } from './tableLimits';

const tableActions = [
  ['addRowBefore', '위에 행 추가'],
  ['addRowAfter', '아래에 행 추가'],
  ['deleteRow', '선택한 행 삭제'],
  ['addColumnBefore', '왼쪽에 열 추가'],
  ['addColumnAfter', '오른쪽에 열 추가'],
  ['deleteColumn', '선택한 열 삭제'],
  ['deleteTable', '표 삭제'],
] as const;

function canInsertTable(state: EditorState) {
  return state.selection instanceof TextSelection && state.selection.empty && !isInTable(state);
}

function crossesUnsafeRowSpan(map: TableMap, boundary: number) {
  if (boundary === 0 || boundary === map.height) return false;
  const start = boundary * map.width;
  const end = start + map.width - 1;
  for (let index = start; index < end; index++) {
    const cell = map.map[index];
    // ProseMirror's row commands can lose track of following columns after a cell spanning both axes.
    if (cell === map.map[index - map.width] && cell === map.map[index + 1] && cell !== map.map[end]) return true;
  }
  return false;
}

function getTableOptions(state: EditorState) {
  if (!isInTable(state)) return null;
  const current = findTable(state.selection.$head);
  if (!current || findTable(state.selection.$anchor)?.pos !== current.pos) return null;
  const { node: table } = current;
  const map = TableMap.get(table);
  const { width, height } = map;
  if (map.problems?.some(problem => problem.type !== 'colwidth mismatch')) return { valid: false } as const;

  const { top, bottom, left, right } = selectedRect(state);
  const { selection } = state;
  const selectedCells = selection instanceof CellSelection && selection.$anchorCell.pos !== selection.$headCell.pos;
  const unsafeRowBoundaries = new Set<number>();
  for (let boundary = top; boundary <= bottom; boundary++) {
    if (crossesUnsafeRowSpan(map, boundary)) unsafeRowBoundaries.add(boundary);
  }
  const addRow = !getEditorDocumentTableError(state.doc, {
    table,
    size: { width, height: height + 1 },
  });
  const addColumn = !getEditorDocumentTableError(state.doc, {
    table,
    size: { width: width + 1, height },
  });
  const headerRow = rowIsHeader(map, table, 0);
  const headerColumn = columnIsHeader(map, table, 0);
  const singleCell = map.map.every(position => position === map.map[0]);
  return {
    valid: true,
    hasUnsafeRowEdits: unsafeRowBoundaries.size > 0,
    singleCell,
    headerRow,
    headerColumn,
    canToggleRow:
      singleCell ||
      map.cellsInRect({
        top: 0,
        bottom: 1,
        left: headerColumn ? 1 : 0,
        right: width,
      }).length > 0,
    canToggleColumn:
      singleCell ||
      map.cellsInRect({
        top: headerRow ? 1 : 0,
        bottom: height,
        left: 0,
        right: 1,
      }).length > 0,
    actions: {
      addRowBefore: addRow && !unsafeRowBoundaries.has(top),
      addRowAfter: addRow && !unsafeRowBoundaries.has(bottom),
      deleteRow: !unsafeRowBoundaries.size && bottom - top < height && (selectedCells || bottom - top === 1),
      addColumnBefore: addColumn,
      addColumnAfter: addColumn,
      deleteColumn: right - left < width && (selectedCells || right - left === 1),
      deleteTable: true,
    },
  } as const;
}

function InsertTableFields({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const [rows, setRows] = useState('2');
  const [columns, setColumns] = useState('2');
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputClass = 'w-14 rounded-md border border-dark-200 bg-white px-2 py-1';

  function insert() {
    if (disabled || !editor.isEditable || !canInsertTable(editor.state)) return;
    if (!/^\d+$/.test(rows) || !/^\d+$/.test(columns) || Number(rows) < 1 || Number(columns) < 1) {
      setError('행과 열의 수를 1 이상의 정수로 입력해 주세요.');
      return;
    }
    const size = { width: Number(columns), height: Number(rows) };
    const sizeError = getEditorDocumentTableError(editor.state.doc, { size });
    if (sizeError) {
      setError(sizeError);
      return;
    }
    editor.commands.insertTable({
      rows: size.height,
      cols: size.width,
      withHeaderRow,
    });
    editor.view.focus();
  }

  function insertOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      insert();
    }
  }

  return (
    <>
      <fieldset className="flex flex-wrap items-center gap-2" disabled={disabled}>
        <label className="flex items-center gap-1">
          행 수
          <input
            className={inputClass}
            inputMode="numeric"
            value={rows}
            onKeyDown={insertOnEnter}
            onChange={event => {
              setRows(event.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="flex items-center gap-1">
          열 수
          <input
            className={inputClass}
            inputMode="numeric"
            value={columns}
            onKeyDown={insertOnEnter}
            onChange={event => {
              setColumns(event.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={withHeaderRow} onChange={event => setWithHeaderRow(event.target.checked)} />첫
          행을 머리글로 사용
        </label>
        <button type="button" className={menuItemVariants()} onClick={insert}>
          표 삽입
        </button>
      </fieldset>
      {error && (
        <p className="mt-2 text-cherry-700" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function TableOptions({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const { table, insertable } = useEditorState({
    editor,
    selector: () => ({
      table: getTableOptions(editor.state),
      insertable: canInsertTable(editor.state),
    }),
  });
  if (!table) return <InsertTableFields editor={editor} disabled={disabled || !insertable} />;

  function toggleHeading(axis: 'row' | 'column') {
    if (!editor.isEditable || disabled) return;
    const current = getTableOptions(editor.state);
    if (!current?.valid || !(axis === 'row' ? current.canToggleRow : current.canToggleColumn)) return;
    if (current.singleCell) editor.commands.toggleHeaderCell();
    else editor.commands.command(({ state, dispatch }) => toggleHeader(axis)(state, dispatch));
    editor.view.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tableActions.map(([command, label]) => (
        <button
          key={command}
          type="button"
          className={menuItemVariants()}
          disabled={disabled || (table.valid ? !table.actions[command] : command !== 'deleteTable')}
          onClick={() => {
            if (disabled || !editor.isEditable) return;
            const current = getTableOptions(editor.state);
            if (!current || (current.valid ? !current.actions[command] : command !== 'deleteTable')) return;
            editor.commands[command]();
            editor.view.focus();
          }}
        >
          {label}
        </button>
      ))}
      <MenuItem
        label="첫 행 머리글"
        active={table.valid && table.headerRow}
        disabled={disabled || !table.valid || !table.canToggleRow}
        onClick={() => toggleHeading('row')}
      />
      <MenuItem
        label="첫 열 머리글"
        active={table.valid && table.headerColumn}
        disabled={disabled || !table.valid || !table.canToggleColumn}
        onClick={() => toggleHeading('column')}
      />
      {table.valid && table.hasUnsafeRowEdits && (
        <p className="basis-full text-dark-600">행과 열이 함께 병합된 구간에서는 일부 행 편집을 사용할 수 없습니다.</p>
      )}
    </div>
  );
}

export function TableTools({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (!open || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    toggle.current?.focus();
  }

  useEffect(() => {
    const element = editor.view.dom;
    function handleEditorShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || !toggle.current || toggle.current.disabled) return;
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }
      if (event.key !== 'F10' || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      setOpen(true);
      toggle.current.focus();
    }
    element.addEventListener('keydown', handleEditorShortcut, true);
    return () => element.removeEventListener('keydown', handleEditorShortcut, true);
  }, [editor, open]);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className={menuItemVariants({ active: open })}
        aria-expanded={open}
        aria-controls={panelId}
        aria-keyshortcuts="Alt+F10"
        title="표 도구 (Alt+F10)"
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        onKeyDown={closeOnEscape}
      >
        표 도구
      </button>
      <div
        id={panelId}
        role="group"
        aria-label="표 편집"
        hidden={!open}
        className="basis-full rounded-lg border border-dark-200 bg-surface-100/40 p-2 text-sm"
        onKeyDown={closeOnEscape}
      >
        {open && <TableOptions editor={editor} disabled={disabled} />}
      </div>
    </>
  );
}
