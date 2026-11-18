import type { Mark } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { type Editor, getMarkRange } from '@tiptap/react';

export type LinkSelection = {
  selection: TextSelection;
  storedMarks: readonly Mark[] | null;
  from: number;
  to: number;
  text: string;
  mark?: Mark;
};

export function getLinkSelection(editor: Editor, selection = editor.state.selection): LinkSelection | null {
  const { doc, schema } = editor.state;
  if (!(selection instanceof TextSelection) || !selection.$from.sameParent(selection.$to)) return null;
  const storedMarks = selection.eq(editor.state.selection) ? editor.state.storedMarks : null;

  const { $from } = selection;
  const link = schema.marks.link;
  if (!$from.parent.type.allowsMarkType(link)) return null;
  const mark =
    link.isInSet($from.nodeAfter?.marks ?? []) ??
    (selection.empty ? link.isInSet($from.nodeBefore?.marks ?? []) : undefined);
  const range = mark && getMarkRange($from, link, mark.attrs);
  const existing = range && selection.to <= range.to;
  const { from, to } = existing ? range : selection;
  // Display soft breaks as spaces in the label field. A destination-only change keeps the original nodes.
  const text = doc.textBetween(from, to, '', ' ');

  const excludesLink = (mark: Mark) => mark.type !== link && mark.type.excludes(link);
  let blocked = false;
  if (from === to) {
    blocked = (storedMarks ?? $from.marks()).some(excludesLink);
  } else {
    doc.nodesBetween(from, to, node => {
      if (node.isInline && node.marks.some(excludesLink)) blocked = true;
    });
  }
  if (blocked) return null;

  return { selection, storedMarks, from, to, text, mark: existing ? mark : undefined };
}

export function getCurrentLinkSelection(editor: Editor): LinkSelection | null {
  const { view } = editor;
  const selection = view.dom.ownerDocument.getSelection();
  if (
    !view.hasFocus() ||
    !selection?.anchorNode ||
    !selection.focusNode ||
    !view.dom.contains(selection.anchorNode) ||
    !view.dom.contains(selection.focusNode)
  ) {
    return getLinkSelection(editor);
  }

  // A keyboard shortcut can arrive before ProseMirror processes the browser's selectionchange.
  try {
    const doc = editor.state.doc;
    const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
    const head = view.posAtDOM(selection.focusNode, selection.focusOffset);
    if (!doc.resolve(anchor).parent.inlineContent || !doc.resolve(head).parent.inlineContent) return null;
    return getLinkSelection(editor, TextSelection.create(doc, anchor, head));
  } catch {
    return null;
  }
}

export function isCompleteLinkAddress(href: string) {
  if (!/^https?:\/\/[^/]/i.test(href) || /[\p{Cc}\s\\]/u.test(href)) return false;
  try {
    return Boolean(new URL(href).hostname);
  } catch {
    return false;
  }
}

export function applyLink(editor: Editor, draft: LinkSelection, change: { text: string; href: string } | null) {
  const { from, to, selection, storedMarks, mark } = draft;
  const { schema, tr } = editor.state;
  const link = schema.marks.link;
  const text = change?.text ?? draft.text;
  const labelChanged = text !== draft.text;
  const nextLink = change && link.create({ ...mark?.attrs, href: change.href });

  // Match the link extension's commands: explicit link edits must not trigger auto-linking.
  tr.setMeta('preventAutolink', true);
  if (!nextLink) {
    tr.removeMark(from, to, link);
  } else if (!labelChanged) {
    tr.addMark(from, to, nextLink);
  } else {
    const $from = tr.doc.resolve(from);
    let marks = from === to ? (storedMarks ?? $from.marks()) : ($from.nodeAfter?.marks ?? []);
    tr.doc.nodesBetween(from, to, node => {
      if (node.isText) marks = marks.filter(candidate => candidate.isInSet(node.marks));
    });
    tr.replaceWith(from, to, schema.text(text, nextLink.addToSet(marks)));
  }

  const nextSelection = labelChanged
    ? TextSelection.create(tr.doc, from + text.length)
    : selection.map(tr.doc, tr.mapping);
  tr.setSelection(nextSelection);
  const outsideLink = !change || labelChanged || selection.from === from || selection.from === to;
  if (nextSelection.empty && (storedMarks || (change && outsideLink))) {
    const marks = storedMarks ?? nextSelection.$from.marks();
    const formatting = marks.filter(mark => mark.type !== link);
    // Carry pending formatting forward. Inside an existing link, use its updated mark for further typing.
    const typingLink = !outsideLink && link.isInSet(marks) && link.isInSet(nextSelection.$from.marks());
    tr.setStoredMarks(typingLink ? typingLink.addToSet(formatting) : formatting);
  }
  editor.view.dispatch(tr);
}
