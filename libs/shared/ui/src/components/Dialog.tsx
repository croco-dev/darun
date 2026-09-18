'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { cn } from '../lib/utils';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, labelledBy, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      if (!dialog.contains(document.activeElement)) {
        const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? dialog).focus();
      }
    } else if (dialog.open) {
      dialog.close();
      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog.open) {
        return;
      }
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        element => element.offsetParent !== null || element === document.activeElement
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleClose = () => {
      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };

    dialog.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={cn(
        'm-auto max-h-[calc(100dvh-3rem)] max-w-[min(96rem,100vw-2rem)] bg-transparent p-0 text-dark-900',
        className
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
