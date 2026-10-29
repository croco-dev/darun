import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Typography from '@tiptap/extension-typography';
import { Plugin } from '@tiptap/pm/state';
import { Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { getEditorDocumentTableError, readTableRowSpan } from './tableLimits';

// Read native DOM spans so HTML bounds apply before ProseMirror allocates its grid.
const tableSpanAttributes = {
  colspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => (element as HTMLTableCellElement).colSpan,
  },
  rowspan: {
    default: 1,
    parseHTML: (element: HTMLElement) => readTableRowSpan(element as HTMLTableCellElement),
  },
};

export function createAdminEditorExtensions(onTableRejected?: (message: string) => void) {
  return [
    Extension.create({
      name: 'tableGridLimit',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            filterTransaction(transaction) {
              if (!transaction.docChanged) return true;
              const error = getEditorDocumentTableError(transaction.doc);
              if (!error) return true;
              onTableRejected?.(error);
              return false;
            },
          }),
        ];
      },
    }),
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
