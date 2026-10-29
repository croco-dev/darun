import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';

// Read native DOM spans so HTML bounds apply before ProseMirror allocates its grid.
const tableSpanAttributes = {
  colspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => (element as HTMLTableCellElement).colSpan,
  },
  rowspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => {
      const cell = element as HTMLTableCellElement;
      const row = cell.closest('tr');
      const section = row?.parentElement as HTMLTableSectionElement | null;
      const remainingRows = row && section?.rows ? section.rows.length - row.sectionRowIndex : 1;
      // A zero span reaches the end of its row group, never the next group.
      return Math.min(cell.rowSpan || remainingRows, remainingRows);
    },
  },
};

export function createAdminEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Image,
    Typography,
    Table,
    TableRow,
    TableHeader.extend({
      addAttributes() {
        return { ...this.parent?.(), ...tableSpanAttributes };
      },
    }),
    TableCell.extend({
      addAttributes() {
        return { ...this.parent?.(), ...tableSpanAttributes };
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
    }),
  ];
}
