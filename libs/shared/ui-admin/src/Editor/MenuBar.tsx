'use client';

import { useImageUpload } from '@darun/utils-image-upload';
import { Editor } from '@tiptap/react';
import { useCallback, useMemo, useRef } from 'react';
import { MenuItem } from './MenuItem';
import './MenuBar.scss';

type MenuBarProps = {
  editor: Editor;
};

export function MenuBar({ editor }: MenuBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { upload } = useImageUpload();

  const handleSelectImage = useCallback(async () => {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = await upload('images/editor', file, file.name);

    if (!imageUrl) {
      return;
    }

    editor.chain().focus().setImage({ src: imageUrl }).run();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [editor, upload]);

  const menuItems = useMemo(
    () => [
      {
        label: 'B',
        action: () => editor.chain().focus().toggleBold().run(),
        active: editor.isActive('bold'),
      },
      {
        label: 'I',
        action: () => editor.chain().focus().toggleItalic().run(),
        active: editor.isActive('italic'),
      },
      {
        label: 'H1',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        active: editor.isActive('heading', { level: 1 }),
      },
      {
        label: 'H2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        active: editor.isActive('heading', { level: 2 }),
      },
      {
        label: '• List',
        action: () => editor.chain().focus().toggleBulletList().run(),
        active: editor.isActive('bulletList'),
      },
      {
        label: '1. List',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        active: editor.isActive('orderedList'),
      },
    ],
    [editor]
  );

  return (
    <div className="menu-bar">
      {menuItems.map(({ label, action, active }) => (
        <MenuItem key={label} label={label} onClick={action} active={active} />
      ))}
      <label className="menu-item">
        Image
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleSelectImage} />
      </label>
    </div>
  );
}
