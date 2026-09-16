'use client';

import { cn } from '@darun/ui';
import { useImageUpload } from '@darun/utils-image-upload';
import { Editor } from '@tiptap/react';
import { useCallback, useMemo, useRef } from 'react';
import { MenuItem, menuItemVariants } from './MenuItem';

type MenuBarProps = {
  editor: Editor;
  disabled?: boolean;
};

export function MenuBar({ editor, disabled = false }: MenuBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { upload } = useImageUpload();

  const handleSelectImage = useCallback(async () => {
    if (disabled) {
      return;
    }

    const file = inputRef.current?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const imageUrl = await upload('images/editor', file, file.name);

      if (!imageUrl) {
        return;
      }

      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (error) {
      console.error('image upload failed:', error);
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [disabled, editor, upload]);

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
    <div className="flex flex-wrap gap-2">
      {menuItems.map(({ label, action, active }) => (
        <MenuItem key={label} label={label} disabled={disabled} onClick={action} active={active} />
      ))}
      <label
        className={cn(
          menuItemVariants({ active: false }),
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
          'inline-flex items-center'
        )}
      >
        Image
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleSelectImage}
        />
      </label>
    </div>
  );
}
