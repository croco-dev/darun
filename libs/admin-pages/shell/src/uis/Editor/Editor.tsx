'use client';

import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './Editor.scss';
import { MenuBar } from './MenuBar';

type EditorProps = {
  defaultValue?: string;
  onChange: (content: string) => void;
};

export const Editor = ({ defaultValue, onChange }: EditorProps) => {
  const editor = useEditor(
    {
      extensions: [StarterKit.configure(), Typography, Image],
      content: defaultValue?.replace(/\n/g, '<br />'),
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      immediatelyRender: false,
    },
    [defaultValue]
  );

  return (
    <div className="editor">
      {editor && <MenuBar editor={editor} />}
      <EditorContent className="editor__content" editor={editor} />
    </div>
  );
};
