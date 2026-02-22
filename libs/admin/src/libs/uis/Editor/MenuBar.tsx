'use client';

import './MenuBar.scss';
import { Editor } from '@tiptap/react';
import { ChangeEvent, Fragment, useCallback, useMemo, useRef } from 'react';
import { useImageUpload } from '../../utils/useImageUplaod';
import { MenuItem } from './MenuItem';

type MenuBarProps = { editor: Editor };

export const MenuBar = ({ editor }: MenuBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const items = useMemo(
    () => [
      {
        icon: 'bold',
        title: 'Bold',
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        icon: 'italic',
        title: 'Italic',
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        icon: 'strikethrough',
        title: 'Strike',
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive('strike'),
      },
      {
        icon: 'code-view',
        title: 'Code',
        action: () => editor.chain().focus().toggleCode().run(),
        isActive: () => editor.isActive('code'),
      },
      {
        type: 'divider',
      },
      {
        icon: 'h-1',
        title: 'Heading 1',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive('heading', { level: 1 }),
      },
      {
        icon: 'h-2',
        title: 'Heading 2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive('heading', { level: 2 }),
      },
      {
        icon: 'paragraph',
        title: 'Paragraph',
        action: () => editor.chain().focus().setParagraph().run(),
        isActive: () => editor.isActive('paragraph'),
      },
      {
        icon: 'list-unordered',
        title: 'Bullet List',
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        icon: 'list-ordered',
        title: 'Ordered List',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
      {
        icon: 'code-box-line',
        title: 'Code Block',
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock'),
      },
      {
        icon: 'file-image-line',
        title: 'Insert Image',
        action: () => triggerImageUpload(),
      },
      {
        type: 'divider',
      },
      {
        icon: 'double-quotes-l',
        title: 'Blockquote',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote'),
      },
      {
        icon: 'separator',
        title: 'Horizontal Rule',
        action: () => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        type: 'divider',
      },
      {
        icon: 'text-wrap',
        title: 'Hard Break',
        action: () => editor.chain().focus().setHardBreak().run(),
      },
      {
        icon: 'format-clear',
        title: 'Clear Format',
        action: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
      },
      {
        type: 'divider',
      },
      {
        icon: 'arrow-go-back-line',
        title: 'Undo',
        action: () => editor.chain().focus().undo().run(),
      },
      {
        icon: 'arrow-go-forward-line',
        title: 'Redo',
        action: () => editor.chain().focus().redo().run(),
      },
    ],
    [editor, triggerImageUpload]
  );

  const { upload } = useImageUpload();

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    try {
      if (!file || !fileInputRef.current) return;

      const url = await upload('images/attachments', file, file.name);

      if (!url) return;

      editor?.chain().focus().setImage({ src: url }).run();
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="editor__header">
      {(() => {
        let dividerOrder = 0;

        return items.map(item => {
          let key: string;

          if (item.type === 'divider') {
            dividerOrder += 1;
            key = `divider-${dividerOrder}`;
          } else {
            key = `${item.icon ?? 'item'}-${item.title ?? 'untitled'}`;
          }

          return (
            <Fragment key={key}>
              {item.type === 'divider' ? <div className="divider" aria-hidden="true" /> : <MenuItem {...item} />}
            </Fragment>
          );
        });
      })()}
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" style={{ display: 'none' }} />
    </div>
  );
};
