'use client';

import { X, cn } from '@darun/ui';
import { ReactNode, useCallback, useEffect, useRef } from 'react';

export type AdminModalProps = {
  opened: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
};

export function AdminModal({ opened, onClose, title, children, className, maxWidth = 'max-w-lg' }: AdminModalProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const mouseDownOnBackdropRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalContentRef.current) {
        const focusableElements = modalContentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalContentRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalContentRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!opened) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside the modal on next tick
    const timer = setTimeout(() => {
      if (modalContentRef.current) {
        const firstFocusable = modalContentRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [opened, handleKeyDown]);

  if (!opened) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'admin-modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
      onMouseDown={e => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) {
          onClose();
        }
      }}
    >
      <div
        ref={modalContentRef}
        className={cn(
          'relative w-full rounded-2xl border border-dark-200 bg-white p-6 shadow-2xl transition-all',
          maxWidth,
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          {title ? (
            <h2 id="admin-modal-title" className="text-lg font-bold text-dark-900 break-words [word-break:keep-all]">
              {title}
            </h2>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dark-400 hover:bg-dark-100 hover:text-dark-900 transition active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 focus-visible:ring-offset-2"
            aria-label="닫기"
          >
            <X size={18} aria-hidden="true" className="shrink-0 stroke-[2]" />
          </button>
        </div>
        <div className="max-h-[calc(85vh-8rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
