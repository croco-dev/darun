import type { Node } from '@tiptap/pm/model';

const MAX_TABLE_COLUMNS = 1000;
const MAX_TABLE_GRID_CELLS = 100_000;
const TABLE_SIZE_ERROR = '문서의 표가 너무 큽니다. 표를 나누거나 행·열 수를 줄여주세요. 원문은 변경하지 않았습니다.';

type CellSpan = { colspan: number; rowspan: number };

export function readTableRowSpan(cell: HTMLTableCellElement) {
  const row = cell.closest('tr');
  const section = row?.parentElement as HTMLTableSectionElement | null;
  const remainingRows = row && section?.rows ? section.rows.length - row.sectionRowIndex : 1;
  // A zero span reaches the end of its row group, never the next group.
  return Math.min(cell.rowSpan || remainingRows, remainingRows);
}

function tableGridError(tables: CellSpan[][][]) {
  let totalGridCells = 0;
  for (const rows of tables) {
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
          return TABLE_SIZE_ERROR;
        }
        rowColumns += colspan;
        if (rowspan > 1) {
          activeColumns += colspan;
          endingSpans.set(index + rowspan, (endingSpans.get(index + rowspan) ?? 0) + colspan);
        }
      }
      columns = Math.max(columns, rowColumns);
      if (columns > MAX_TABLE_COLUMNS || totalGridCells + columns * rows.length > MAX_TABLE_GRID_CELLS) {
        return TABLE_SIZE_ERROR;
      }
    }
    totalGridCells += columns * rows.length;
  }
  return null;
}

export function getEditorTableError(html: string) {
  if (typeof DOMParser === 'undefined') return null;
  const document = new DOMParser().parseFromString(html, 'text/html');
  return tableGridError(
    [...document.querySelectorAll('table')].map(table =>
      [...table.rows].map(row =>
        [...row.cells].map(cell => ({ colspan: cell.colSpan, rowspan: readTableRowSpan(cell) }))
      )
    )
  );
}

export function getEditorDocumentTableError(document: Node) {
  const tables: CellSpan[][][] = [];
  document.descendants(node => {
    if (node.type.name !== 'table') return;
    const rows: CellSpan[][] = [];
    node.forEach(row => {
      const cells: CellSpan[] = [];
      row.forEach(cell => cells.push({ colspan: cell.attrs.colspan, rowspan: cell.attrs.rowspan }));
      rows.push(cells);
    });
    tables.push(rows);
  });
  return tableGridError(tables);
}
