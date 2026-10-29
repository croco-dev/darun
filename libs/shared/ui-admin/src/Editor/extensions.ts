import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';

export function createAdminEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Image,
    Typography,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
    }),
  ];
}
