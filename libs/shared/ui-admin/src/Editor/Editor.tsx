'use client';

import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { MenuBar } from './MenuBar';

type EditorProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  disabled?: boolean;
};

export function Editor({ value, defaultValue, onChange, editable = true, disabled = false }: EditorProps) {
  const isEditable = editable && !disabled;
  const initialContent = value !== undefined ? value : (defaultValue ?? '');
  const editor = useEditor({
    extensions: [StarterKit, Image, Typography],
    content: initialContent,
    editable: isEditable,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.isEditable !== isEditable) {
      editor.setEditable(isEditable);
    }
  }, [editor, isEditable]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = value !== undefined ? value : (defaultValue ?? '');

    if (editor.getHTML() === nextValue) {
      return;
    }

    editor.commands.setContent(nextValue, false);
  }, [value, defaultValue, editor]);

  if (!editor) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-100" />
        <div className="min-h-72 rounded-card border border-dark-200 bg-surface-100/40 p-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MenuBar editor={editor} disabled={!isEditable} />
      <EditorContent
        editor={editor}
        className="min-h-72 rounded-card border border-dark-200 bg-white p-4 [&_.ProseMirror]:min-h-60 [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
