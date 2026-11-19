'use client';

import { useImageUpload } from '@darun/utils-image-upload';
import { notifications } from '@mantine/notifications';
import { NodeSelection } from '@tiptap/pm/state';
import { type Editor, useEditorState } from '@tiptap/react';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AdminModalOpenContext } from '../AdminModal';
import type { ImageCaption } from './CaptionedImage';
import { ImageAltFields } from './ImageAltFields';
import { ImageCaptionFields } from './ImageCaptionFields';
import { imageInsertionKey, insertUploadedImage } from './imageInsertion';
import { LinkFields } from './LinkFields';
import { applyLink, getCurrentLinkSelection, getLinkSelection, type LinkSelection } from './linkSelection';
import { MenuItem, menuItemVariants } from './MenuItem';

type MenuBarProps = {
  editor: Editor;
  disabled?: boolean;
  onImageUploadingChange?: (uploading: boolean) => void;
};

type ImageDraft = { kind: 'upload'; file: File } | { kind: 'alt' | 'caption'; selection: NodeSelection };

function getSelectedImage(editor: Editor) {
  const { selection } = editor.state;
  return selection instanceof NodeSelection && selection.node.type.name === 'image' ? selection : null;
}

export function MenuBar({ editor, disabled = false, onImageUploadingChange }: MenuBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editImageButtonRef = useRef<HTMLButtonElement | null>(null);
  const { upload } = useImageUpload();
  const modalOpen = useContext(AdminModalOpenContext);
  const [imageDraft, setImageDraft] = useState<ImageDraft | null>(null);
  const [linkDraft, setLinkDraft] = useState<LinkSelection | null>(null);
  if (!modalOpen && linkDraft) setLinkDraft(null);
  if (!modalOpen && imageDraft?.kind === 'caption') setImageDraft(null);
  const [isUploading, setIsUploading] = useState(false);
  const activeUpload = useRef<{
    controller: AbortController;
    onImageUploadingChange?: (uploading: boolean) => void;
  } | null>(null);
  const toolbarDisabled = disabled || isUploading || imageDraft !== null || linkDraft !== null;

  function openLinkEditor() {
    if (!modalOpen || toolbarDisabled || !editor.isEditable || activeUpload.current) return false;
    const draft = getCurrentLinkSelection(editor);
    if (!draft) return false;
    setLinkDraft(draft);
    return true;
  }

  const openLinkFromShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.key.toLowerCase() !== 'k' ||
      !(event.metaKey || event.ctrlKey) ||
      event.altKey ||
      event.shiftKey ||
      event.isComposing
    ) {
      return;
    }
    if (openLinkEditor()) event.preventDefault();
  });

  useEffect(
    () => () => {
      const pending = activeUpload.current;
      activeUpload.current = null;
      pending?.controller.abort();
      pending?.onImageUploadingChange?.(false);
    },
    [editor]
  );

  useEffect(() => {
    const editorElement = editor.view.dom;
    const focusImageEditButton = (event: KeyboardEvent) => {
      const button = editImageButtonRef.current;
      if (
        event.key !== 'Tab' ||
        !event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !button ||
        button.disabled ||
        !getSelectedImage(editor)
      ) {
        return;
      }

      // Table shortcuts otherwise move to a different cell and deselect the image.
      event.preventDefault();
      event.stopPropagation();
      button.focus();
    };
    editorElement.addEventListener('keydown', focusImageEditButton, true);
    editorElement.addEventListener('keydown', openLinkFromShortcut);
    return () => {
      editorElement.removeEventListener('keydown', focusImageEditButton, true);
      editorElement.removeEventListener('keydown', openLinkFromShortcut);
    };
  }, [editor]);

  const handleSelectImage = () => {
    if (disabled || imageDraft || linkDraft || activeUpload.current) {
      return;
    }

    const file = inputRef.current?.files?.[0];

    if (!file) return;
    if (inputRef.current) inputRef.current.value = '';

    if (!file.type.startsWith('image/')) {
      notifications.show({
        message: '이미지 파일만 업로드할 수 있습니다.',
        color: 'red',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notifications.show({
        message: '이미지 크기는 최대 10MB까지 가능합니다.',
        color: 'red',
      });
      return;
    }

    const { from, to } = editor.state.selection;
    editor.commands.setMeta(imageInsertionKey, { from, to });
    setImageDraft({ kind: 'upload', file });
  };

  function closeImageFields() {
    if (imageDraft?.kind === 'upload' && imageInsertionKey.getState(editor.state)) {
      editor.commands.setMeta(imageInsertionKey, null);
    }
    setImageDraft(null);
    if (!disabled && editor.isEditable) editor.commands.focus();
  }

  function requestNewImagePosition() {
    closeImageFields();
    notifications.show({
      message: '본문에서 이미지를 넣을 위치를 다시 선택해 주세요.',
      color: 'red',
    });
  }

  function updateImage(selection: NodeSelection, attributes: { alt: string } | ImageCaption) {
    if (disabled || !editor.isEditable || activeUpload.current) return;
    if (editor.state.doc !== selection.$from.doc) {
      notifications.show({
        message: '본문에서 이미지를 다시 선택해 주세요.',
        color: 'red',
      });
    } else {
      editor.chain().setNodeSelection(selection.from).updateAttributes('image', attributes).run();
    }
    closeImageFields();
  }

  const confirmImage = async (alt: string) => {
    if (disabled || !editor.isEditable || !imageDraft || activeUpload.current) return;

    if (imageDraft.kind === 'alt') return updateImage(imageDraft.selection, { alt });
    if (imageDraft.kind !== 'upload') return;

    if (!imageInsertionKey.getState(editor.state)) {
      requestNewImagePosition();
      return;
    }

    const { file } = imageDraft;
    const pending = {
      controller: new AbortController(),
      onImageUploadingChange,
    };
    activeUpload.current = pending;
    try {
      setIsUploading(true);
      onImageUploadingChange?.(true);
      const imageUrl = await upload('images/editor', file, file.name, pending.controller.signal);

      if (activeUpload.current !== pending || editor.isDestroyed) return;

      const insertion = imageInsertionKey.getState(editor.state);
      if (!insertion || !editor.isEditable) {
        requestNewImagePosition();
        return;
      }

      if (!imageUrl) {
        notifications.show({
          message: '이미지 업로드에 실패했습니다.',
          color: 'red',
        });
        return;
      }

      if (!insertUploadedImage(editor, insertion, imageUrl, alt)) {
        requestNewImagePosition();
        return;
      }
      closeImageFields();
      notifications.show({
        message: '이미지가 본문에 추가되었습니다.',
        color: 'teal',
      });
    } catch (error) {
      if (activeUpload.current !== pending || editor.isDestroyed) return;
      console.error('image upload failed:', error);
      notifications.show({
        message: '이미지 업로드에 실패했습니다.',
        color: 'red',
      });
    } finally {
      if (activeUpload.current === pending) {
        activeUpload.current = null;
        setIsUploading(false);
        onImageUploadingChange?.(false);
      }
    }
  };

  // Read the current prop even before a replacement editor emits its first transaction.
  const activeFormats = useEditorState({
    editor,
    selector: () => ({
      imageSelected: getSelectedImage(editor) !== null,
      linkEditable: getLinkSelection(editor) !== null,
      link: editor.isActive('link'),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      heading1: editor.isActive('heading', { level: 1 }),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      blockquote: editor.isActive('blockquote'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
    }),
  });
  const menuItems = [
    {
      label: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      active: activeFormats.bold,
    },
    {
      label: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: activeFormats.italic,
    },
    {
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: activeFormats.heading1,
    },
    {
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: activeFormats.heading2,
    },
    {
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: activeFormats.heading3,
    },
    {
      label: '❝ Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: activeFormats.blockquote,
    },
    {
      label: '• List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: activeFormats.bulletList,
    },
    {
      label: '1. List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: activeFormats.orderedList,
    },
  ];

  function closeLinkEditor(restoreSelection: boolean) {
    setLinkDraft(null);
    if (disabled || !editor.isEditable) return;
    if (restoreSelection && linkDraft && editor.state.doc === linkDraft.selection.$from.doc) {
      editor.view.dispatch(editor.state.tr.setSelection(linkDraft.selection).setStoredMarks(linkDraft.storedMarks));
    }
    if (editor.view.hasFocus()) {
      // Tabbing back into the editor can move the DOM caret before ProseMirror observes it.
      editor.view.focus();
    } else {
      editor.commands.focus();
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="서식 도구 모음">
        {menuItems.map(({ label, action, active }) => (
          <MenuItem key={label} label={label} disabled={toolbarDisabled} onClick={action} active={active} />
        ))}
        <button
          type="button"
          className={menuItemVariants({ active: activeFormats.link })}
          aria-haspopup="dialog"
          aria-expanded={linkDraft !== null}
          aria-keyshortcuts="Control+K Meta+K"
          disabled={toolbarDisabled || !activeFormats.linkEditable}
          onClick={openLinkEditor}
        >
          본문 링크 편집
        </button>
        <button
          type="button"
          className={menuItemVariants()}
          disabled={toolbarDisabled}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? '업로드 중...' : '이미지 추가'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          aria-label="본문 이미지 업로드"
          disabled={toolbarDisabled}
          onChange={handleSelectImage}
        />
        <button
          type="button"
          className={menuItemVariants()}
          disabled={toolbarDisabled || !activeFormats.imageSelected}
          onClick={() => {
            const selection = getSelectedImage(editor);
            if (selection) setImageDraft({ kind: 'caption', selection });
          }}
        >
          이미지 캡션·출처 편집
        </button>
        <button
          type="button"
          className={menuItemVariants()}
          ref={editImageButtonRef}
          disabled={toolbarDisabled || !activeFormats.imageSelected}
          onClick={() => {
            const selection = getSelectedImage(editor);
            if (selection) setImageDraft({ kind: 'alt', selection });
          }}
        >
          이미지 대체 텍스트 수정
        </button>
      </div>
      {linkDraft && (
        <LinkFields
          initialText={linkDraft.text}
          initialHref={linkDraft.mark?.attrs.href ?? undefined}
          disabled={disabled}
          onApply={change => {
            if (disabled || !editor.isEditable || activeUpload.current) return;
            if (editor.state.doc !== linkDraft.selection.$from.doc) {
              return '본문이 변경되었습니다. 링크 편집을 닫고 다시 선택해 주세요.';
            }
            const changed = !change || change.href !== linkDraft.mark?.attrs.href || change.text !== linkDraft.text;
            if (changed) applyLink(editor, linkDraft, change);
            closeLinkEditor(!changed);
          }}
          onCancel={() => closeLinkEditor(true)}
        />
      )}
      {imageDraft?.kind === 'caption' && (
        <ImageCaptionFields
          initial={imageDraft.selection.node.attrs as ImageCaption}
          disabled={disabled}
          onApply={attributes => updateImage(imageDraft.selection, attributes)}
          onCancel={closeImageFields}
        />
      )}
      {imageDraft && imageDraft.kind !== 'caption' && (
        <ImageAltFields
          adding={imageDraft.kind === 'upload'}
          initialAlt={imageDraft.kind === 'alt' ? (imageDraft.selection.node.attrs.alt as string | null) : null}
          disabled={disabled || isUploading}
          onConfirm={confirmImage}
          onCancel={closeImageFields}
        />
      )}
    </>
  );
}
