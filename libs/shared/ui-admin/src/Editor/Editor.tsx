'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { createAdminEditorExtensions } from './extensions';
import { MenuBar } from './MenuBar';
import { getEditorTableError } from './tableLimits';

type EditorProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (content: string) => void;
  onImageUploadingChange?: (uploading: boolean) => void;
  editable?: boolean;
  disabled?: boolean;
};

export function Editor({
  value,
  defaultValue,
  onChange,
  onImageUploadingChange,
  editable = true,
  disabled = false,
}: EditorProps) {
  const initialContent = value !== undefined ? value : (defaultValue ?? '');
  const [rejectedTable, setRejectedTable] = useState<{ content: string; error: string | null }>({
    content: initialContent,
    error: null,
  });
  if (rejectedTable.content !== initialContent) {
    setRejectedTable({ content: initialContent, error: null });
  }
  const reportTableError = (error: string | null) => {
    setRejectedTable(current => (current.error === error ? current : { ...current, error }));
  };
  const rejectedTableError = rejectedTable.error;
  const contentError = getEditorTableError(initialContent);
  const isEditable = editable && !disabled && !contentError;
  const editor = useEditor({
    extensions: createAdminEditorExtensions(reportTableError),
    content: contentError ? '' : initialContent,
    editable: isEditable,
    editorProps: {
      handleDOMEvents: {
        paste: (_view, event) => {
          const error = getEditorTableError(event.clipboardData?.getData('text/html') ?? '');
          if (!error) return false;
          event.preventDefault();
          reportTableError(error);
          return true;
        },
        drop: (_view, event) => {
          const error = getEditorTableError(event.dataTransfer?.getData('text/html') ?? '');
          if (!error) return false;
          event.preventDefault();
          reportTableError(error);
          return true;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (contentError) return;
      reportTableError(null);
      onChange?.(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.isEditable !== isEditable) {
      editor.setEditable(isEditable, false);
    }
  }, [editor, isEditable]);

  useEffect(() => {
    if (!editor || contentError) {
      return;
    }

    const nextValue = value !== undefined ? value : (defaultValue ?? '');

    if (editor.getHTML() === nextValue) {
      return;
    }

    editor.commands.setContent(nextValue, false);
  }, [value, defaultValue, editor, contentError]);

  if (contentError) {
    return (
      <p role="alert" className="text-sm text-cherry-700">
        {contentError}
      </p>
    );
  }

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
      {rejectedTableError && (
        <p role="alert" className="text-sm text-cherry-700">
          {rejectedTableError}
        </p>
      )}
      <MenuBar editor={editor} disabled={!isEditable} onImageUploadingChange={onImageUploadingChange} />
      <EditorContent
        editor={editor}
        className="min-h-72 min-w-0 overflow-x-auto rounded-card border border-dark-200 bg-white p-4 [&_.ProseMirror]:min-h-60 [&_.ProseMirror]:outline-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-dark-200 [&_th]:bg-surface-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-dark-200 [&_td]:px-3 [&_td]:py-2"
      />
    </div>
  );
}
