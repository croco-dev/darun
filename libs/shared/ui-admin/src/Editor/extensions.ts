import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';

export function createAdminEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Image,
    Typography,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
    }),
  ];
}
