import { fireEvent, screen, within } from '@testing-library/react';
import { vi } from 'vitest';

export function installPreviewDialog() {
  // jsdom does not implement the dialog top layer or iframe srcdoc navigation.
  const prototype = HTMLDialogElement.prototype;
  Object.defineProperties(prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
      },
    },
  });
  return () => {
    Reflect.deleteProperty(prototype, 'showModal');
    Reflect.deleteProperty(prototype, 'close');
  };
}

export function openDraftPreview() {
  fireEvent.click(screen.getByRole('button', { name: '공개 미리보기' }));
  const iframe = screen.getByTitle<HTMLIFrameElement>('공개 화면');
  const frameDocument = iframe.contentDocument!;
  const url = vi.spyOn(frameDocument, 'URL', 'get').mockReturnValue('about:srcdoc');
  try {
    fireEvent.load(iframe);
  } finally {
    url.mockRestore();
  }
  return { iframe, body: within(frameDocument.body) };
}
