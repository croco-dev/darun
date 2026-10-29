import type { Node, Slice } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { CellSelection, isInTable, selectedRect } from '@tiptap/pm/tables';

const MAX_TABLE_COLUMNS = 1000;
const MAX_TABLE_ROWS = 1000;
const MAX_TABLE_GRID_CELLS = 100_000;
const TABLE_SIZE_ERROR = '표의 크기가 편집 가능한 범위를 넘었습니다. 원문은 변경하지 않았습니다.';
const EMPTY_TABLE_PASTE_ERROR = '빈 표는 붙여넣을 수 없습니다. 원문은 변경하지 않았습니다.';

type CellSpan = { colspan: number; rowspan: number };
type TableSize = { width: number; height: number };

export function readTableRowSpan(cell: HTMLTableCellElement) {
  const row = cell.closest('tr');
  const section = row?.parentElement as HTMLTableSectionElement | null;
  const remainingRows = row && section?.rows ? section.rows.length - row.sectionRowIndex : 1;
  // A zero span reaches the end of its row group, never the next group.
  return Math.min(cell.rowSpan || remainingRows, remainingRows);
}

function tableSize(rows: CellSpan[][]): TableSize | null {
  if (rows.length > MAX_TABLE_ROWS) return null;
  let activeColumns = 0;
  let columns = 0;
  const endingSpans = new Map<number, number>();
  for (const [index, cells] of rows.entries()) {
    activeColumns -= endingSpans.get(index) ?? 0;
    let rowColumns = activeColumns;
    for (const { colspan, rowspan } of cells) {
      if (
        !Number.isSafeInteger(colspan) ||
        colspan < 1 ||
        colspan > MAX_TABLE_COLUMNS ||
        !Number.isSafeInteger(rowspan) ||
        rowspan < 1 ||
        rowspan > rows.length - index
      ) {
        return null;
      }
      rowColumns += colspan;
      if (rowspan > 1) {
        activeColumns += colspan;
        endingSpans.set(index + rowspan, (endingSpans.get(index + rowspan) ?? 0) + colspan);
      }
    }
    columns = Math.max(columns, rowColumns);
    if (columns > MAX_TABLE_COLUMNS || columns * rows.length > MAX_TABLE_GRID_CELLS) {
      return null;
    }
  }
  return { width: columns, height: rows.length };
}

export function getEditorTableError(html: string) {
  if (typeof DOMParser === 'undefined') return null;
  // Match the native clipboard parser's context for standalone table fragments.
  html = html.replace(/^(\s*<meta [^>]*>)*/, '');
  const firstTag = /<([a-z][^>\s]+)/i.exec(html)?.[1].toLowerCase();
  const wrappers: Record<string, string[]> = {
    thead: ['table'],
    tbody: ['table'],
    tfoot: ['table'],
    caption: ['table'],
    colgroup: ['table'],
    col: ['table', 'colgroup'],
    tr: ['table', 'tbody'],
    td: ['table', 'tbody', 'tr'],
    th: ['table', 'tbody', 'tr'],
  };
  const wrap = firstTag && Object.prototype.hasOwnProperty.call(wrappers, firstTag) ? wrappers[firstTag] : undefined;
  if (wrap)
    html =
      wrap.map(tag => `<${tag}>`).join('') +
      html +
      [...wrap]
        .reverse()
        .map(tag => `</${tag}>`)
        .join('');
  const document = new DOMParser().parseFromString(html, 'text/html');
  let totalGridCells = 0;
  for (const table of document.querySelectorAll('table')) {
    if (table.rows.length > MAX_TABLE_ROWS) return TABLE_SIZE_ERROR;
    const size = tableSize(
      [...table.rows].map(row =>
        [...row.cells].map(cell => ({
          colspan: cell.colSpan,
          rowspan: readTableRowSpan(cell),
        }))
      )
    );
    if (!size) return TABLE_SIZE_ERROR;
    totalGridCells += size.width * size.height;
    if (totalGridCells > MAX_TABLE_GRID_CELLS) return TABLE_SIZE_ERROR;
  }
  return null;
}

function nodeCells(row: Node) {
  const cells: CellSpan[] = [];
  row.forEach(cell => cells.push({ colspan: cell.attrs.colspan, rowspan: cell.attrs.rowspan }));
  return cells;
}

function documentTableError(document: Node, replacement?: { table: Node; size: TableSize }) {
  let totalGridCells = 0;
  let error: string | null = null;
  document.descendants(node => {
    if (error) return false;
    if (node.type.name !== 'table') return;
    const rows: CellSpan[][] = [];
    if (node.childCount > MAX_TABLE_ROWS) {
      error = TABLE_SIZE_ERROR;
      return false;
    }
    node.forEach(row => rows.push(nodeCells(row)));
    const size = replacement?.table === node ? replacement.size : tableSize(rows);
    if (!size || size.width > MAX_TABLE_COLUMNS || size.height > MAX_TABLE_ROWS) {
      error = TABLE_SIZE_ERROR;
      return false;
    }
    totalGridCells += size.width * size.height;
    if (totalGridCells > MAX_TABLE_GRID_CELLS) {
      error = TABLE_SIZE_ERROR;
      return false;
    }
  });
  return error;
}

export function getEditorDocumentTableError(document: Node) {
  return documentTableError(document);
}

export function getEditorTablePasteError(state: EditorState, slice: Slice) {
  const error = documentTableError(state.schema.topNodeType.create(null, slice.content));
  if (error || !slice.size) return error;
  // Inspect the same row/cell fragment the native handler will make rectangular,
  // before ensureRectangular/growTable can allocate an expanded grid.
  let { content, openStart, openEnd } = slice;
  while (
    content.childCount === 1 &&
    ((openStart > 0 && openEnd > 0) || content.firstChild?.type.spec.tableRole === 'table')
  ) {
    openStart--;
    openEnd--;
    content = content.firstChild!.content;
  }
  if (!content.childCount) return EMPTY_TABLE_PASTE_ERROR;
  const role = content.firstChild?.type.spec.tableRole;
  const rows: CellSpan[][] = [];
  if (role === 'row') content.forEach(row => rows.push(nodeCells(row)));
  else if (role === 'cell' || role === 'header_cell') {
    const cells: CellSpan[] = [];
    content.forEach(cell => cells.push({ colspan: cell.attrs.colspan, rowspan: cell.attrs.rowspan }));
    rows.push(cells);
  } else return null;
  const incoming = tableSize(rows);
  if (!incoming) return TABLE_SIZE_ERROR;
  if (!incoming.width) return EMPTY_TABLE_PASTE_ERROR;
  if (!isInTable(state) || state.selection instanceof CellSelection) return null;
  const rect = selectedRect(state);
  return documentTableError(state.doc, {
    table: rect.table,
    size: {
      width: Math.max(rect.map.width, rect.left + incoming.width),
      height: Math.max(rect.map.height, rect.top + incoming.height),
    },
  });
}
