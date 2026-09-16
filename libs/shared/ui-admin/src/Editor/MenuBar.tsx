'use client';

import { cn } from '@darun/ui';
import { useImageUpload } from '@darun/utils-image-upload';
import { notifications } from '@mantine/notifications';
import { Editor } from '@tiptap/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { MenuItem, menuItemVariants } from './MenuItem';

type MenuBarProps = {
  editor: Editor;
  disabled?: boolean;
};

export function MenuBar({ editor, disabled = false }: MenuBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { upload } = useImageUpload();
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectImage = useCallback(async () => {
    if (disabled || isUploading) {
      return;
    }

    const file = inputRef.current?.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      notifications.show({ message: '이미지 파일만 업로드할 수 있습니다.', color: 'red' });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notifications.show({ message: '이미지 크기는 최대 10MB까지 가능합니다.', color: 'red' });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await upload('images/editor', file, file.name);

      if (!imageUrl) {
        notifications.show({ message: '이미지 업로드에 실패했습니다.', color: 'red' });
        return;
      }

      editor.chain().focus().setImage({ src: imageUrl }).run();
      notifications.show({ message: '이미지가 본문에 추가되었습니다.', color: 'teal' });
    } catch (error) {
      console.error('image upload failed:', error);
      notifications.show({ message: '이미지 업로드에 실패했습니다.', color: 'red' });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [disabled, editor, isUploading, upload]);

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
        <MenuItem key={label} label={label} disabled={disabled || isUploading} onClick={action} active={active} />
      ))}
      <label
        className={cn(
          menuItemVariants({ active: false }),
          disabled || isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
          'inline-flex items-center'
        )}
      >
        {isUploading ? '업로드 중...' : 'Image'}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleSelectImage}
        />
      </label>
    </div>
  );
}
