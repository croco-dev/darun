import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension, type Editor } from '@tiptap/react';

type ImageInsertion = { from: number; to: number };

export const imageInsertionKey = new PluginKey<ImageInsertion | null>('imageInsertion');

export const ImageInsertionTracking = Extension.create({
  name: 'imageInsertionTracking',
  addProseMirrorPlugins() {
    return [
      new Plugin<ImageInsertion | null>({
        key: imageInsertionKey,
        state: {
          init: () => null,
          apply(transaction, insertion) {
            const requested = transaction.getMeta(imageInsertionKey) as ImageInsertion | null | undefined;
            if (requested !== undefined) return requested;
            if (!insertion || !transaction.docChanged) return insertion;

            const { from, to } = insertion;
            const start = transaction.mapping.mapResult(from, 1);
            if (from === to) {
              return start.deletedAcross ? null : { from: start.pos, to: start.pos };
            }

            // Keep edge edits outside the original selection and preserve any edits within it.
            const end = transaction.mapping.mapResult(to, -1);
            if (start.deleted || end.deleted || start.pos >= end.pos) return null;
            const selected = transaction.before.slice(from, to);
            return selected.eq(transaction.doc.slice(start.pos, end.pos)) ? { from: start.pos, to: end.pos } : null;
          },
        },
      }),
    ];
  },
});

function containsImage(doc: ProseMirrorNode, image: ProseMirrorNode) {
  let found = false;
  doc.descendants(node => {
    if (node === image) found = true;
    return !found;
  });
  return found;
}

export function insertUploadedImage(editor: Editor, insertion: ImageInsertion, src: string, alt: string) {
  const image = editor.schema.nodes.image.create({ src, alt });
  const inserted = editor
    .chain()
    .insertContentAt(insertion, image, { updateSelection: false })
    .command(({ tr }) => {
      // The editor may be unable to fit a block image at this range. Do not apply a partial edit.
      if (!containsImage(tr.doc, image)) {
        tr.setMeta('preventDispatch', true);
        return false;
      }
      tr.setMeta(imageInsertionKey, null);
      return true;
    })
    .run();

  // A plugin can reject the insertion transaction even when the command returns true.
  return inserted && containsImage(editor.state.doc, image);
}
