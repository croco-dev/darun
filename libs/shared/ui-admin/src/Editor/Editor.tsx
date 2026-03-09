'use client';

import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { MenuBar } from './MenuBar';
import './Editor.scss';

type EditorProps = {
  defaultValue?: string;
  onChange: (content: string) => void;
};

export function Editor({ defaultValue, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Image, Typography],
    content: defaultValue ?? '',
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = defaultValue ?? '';

    if (editor.getHTML() === nextValue) {
      return;
    }

    editor.commands.setContent(nextValue, false);
  }, [defaultValue, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
