'use client';

import { Button, ContentArea, Dialog } from '@darun/ui';
import { type ReactNode, useEffect, useEffectEvent, useId, useState } from 'react';
import { createPortal } from 'react-dom';

const PREVIEW_WIDTHS = [390, 1280] as const;
type PreviewWidth = (typeof PREVIEW_WIDTHS)[number];

const PREVIEW_DOCUMENT = `<!doctype html>
  <html lang="ko">
    <head>
      <meta charset="utf-8">
      <meta name="referrer" content="no-referrer">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src https: http: data: blob:; base-uri 'none'; form-action 'none'">
    </head>
    <body></body>
  </html>`;

function PreviewFrame({
  width,
  onClose,
  onTabEnd,
  children,
}: {
  width: PreviewWidth;
  onClose: () => void;
  onTabEnd: () => void;
  children: ReactNode;
}) {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null);
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  });

  useEffect(() => {
    if (!frameDocument) return;
    frameDocument.addEventListener('keydown', handleEscape);
    return () => frameDocument.removeEventListener('keydown', handleEscape);
  }, [frameDocument]);

  return (
    <div
      role="region"
      aria-label="미리보기 화면 스크롤"
      tabIndex={0}
      className="overflow-x-auto overscroll-x-contain rounded-xl bg-surface-100"
    >
      <iframe
        title="공개 화면"
        tabIndex={0}
        sandbox="allow-same-origin"
        srcDoc={PREVIEW_DOCUMENT}
        width={width}
        className="mx-auto block h-[min(42rem,calc(100dvh-12rem))] min-h-36 max-w-none border-0 bg-white"
        onLoad={event => {
          const preview = event.currentTarget.contentDocument;
          if (!preview || preview.URL !== 'about:srcdoc') return;
          preview.body.className = document.body.className;
          const styles = document.head.querySelectorAll('link[rel="stylesheet"], style');
          preview.head.append(...Array.from(styles, style => preview.importNode(style, true)));
          setFrameDocument(preview);
        }}
      />
      {frameDocument &&
        createPortal(
          <ContentArea
            as="main"
            tabIndex={0}
            className="flex min-h-dvh flex-col gap-5 bg-surface-50 py-6"
            onClickCapture={event => event.preventDefault()}
            onAuxClickCapture={event => event.preventDefault()}
          >
            {children}
            {/* Tab at the end of the frame does not reach the dialog's keyboard handler. */}
            <button
              type="button"
              className="sr-only"
              style={{ position: 'fixed', inset: '0 auto auto 0' }}
              onFocus={onTabEnd}
            >
              미리보기 도구로 돌아가기
            </button>
          </ContentArea>,
          frameDocument.body
        )}
    </div>
  );
}

export function DraftPreview({ children, disabled }: { children: () => ReactNode; disabled?: boolean }) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<PreviewWidth>(390);
  const titleId = useId();
  const closeId = useId();
  const close = () => setOpen(false);

  return (
    <>
      <Button
        type="button"
        color="secondary"
        onClick={event => {
          setPortalTarget(event.currentTarget.ownerDocument.body);
          setOpen(true);
        }}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        공개 미리보기
      </Button>
      {portalTarget &&
        createPortal(
          <Dialog open={open} onClose={close} labelledBy={titleId} className="backdrop:backdrop-blur-none">
            <div className="w-[min(84rem,calc(100vw-2rem))] bg-white p-3 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={titleId} className="text-base font-bold text-dark-900">
                  공개 미리보기
                </h2>
                <Button id={closeId} type="button" onClick={close}>
                  미리보기 닫기
                </Button>
              </div>
              <div role="group" aria-label="미리보기 너비" className="mb-3 flex gap-2">
                {PREVIEW_WIDTHS.map(option => (
                  <Button
                    key={option}
                    type="button"
                    aria-pressed={width === option}
                    variant={width === option ? 'contained' : 'base'}
                    color="secondary"
                    onClick={() => setWidth(option)}
                  >
                    {option}px
                  </Button>
                ))}
              </div>
              {open && (
                <PreviewFrame width={width} onClose={close} onTabEnd={() => document.getElementById(closeId)?.focus()}>
                  {children()}
                </PreviewFrame>
              )}
            </div>
          </Dialog>,
          portalTarget
        )}
    </>
  );
}
