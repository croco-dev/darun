'use client';

import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { AdminInput } from '../AdminInput';
import { isCompleteLinkAddress } from './linkSelection';
import { menuItemVariants } from './MenuItem';

type LinkFieldsProps = {
  initialText: string;
  initialHref?: string;
  disabled: boolean;
  onApply: (change: { text: string; href: string } | null) => string | void;
  onCancel: () => void;
};

export function LinkFields({ initialText, initialHref, disabled, onApply, onCancel }: LinkFieldsProps) {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref ?? '');
  const [error, setError] = useState<{
    message: string;
    field?: 'text' | 'href';
  } | null>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const hrefInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    (initialText ? hrefInput : textInput).current?.focus();
  }, [initialText]);

  const cancelLink = useEffectEvent(onCancel);

  useEffect(() => {
    const fields = fieldsRef.current;
    const editor = fields?.parentElement;
    if (!fields || !editor) return;
    const scope = editor.closest('[role="dialog"]') ?? editor.closest('form') ?? editor;
    const ownerDocument = fields.ownerDocument;

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !(event.target instanceof Node) || !scope.contains(event.target)) return;
      // The link draft owns Escape even when focus has moved to the editor or the enclosing modal.
      event.stopPropagation();
      if (event.isComposing) return;
      event.preventDefault();
      cancelLink();
    }

    ownerDocument.addEventListener('keydown', dismissOnEscape, true);
    return () => ownerDocument.removeEventListener('keydown', dismissOnEscape, true);
  }, []);

  function submit() {
    if (!text.trim()) {
      setError({ field: 'text', message: '표시 문구를 입력해 주세요.' });
      textInput.current?.focus();
      return;
    }
    const address = href.trim();
    if (!isCompleteLinkAddress(address)) {
      setError({
        field: 'href',
        message: 'http:// 또는 https://로 시작하는 전체 주소를 입력해 주세요.',
      });
      hrefInput.current?.focus();
      return;
    }
    const message = onApply({ text, href: address });
    if (message) setError({ message });
  }

  return (
    <div ref={fieldsRef} role="dialog" aria-labelledby={titleId}>
      <fieldset
        disabled={disabled}
        className="grid min-w-0 gap-3 rounded-lg border border-dark-200 p-3 text-sm"
        onKeyDown={event => {
          if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.nativeEvent.isComposing)
            return;
          event.preventDefault();
          submit();
        }}
      >
        <legend id={titleId} className="px-1 font-medium">
          본문 링크 편집
        </legend>
        <label className="grid gap-1">
          표시 문구
          <AdminInput
            ref={textInput}
            value={text}
            aria-invalid={error?.field === 'text' || undefined}
            aria-describedby={error?.field === 'text' ? errorId : undefined}
            onChange={event => {
              setText(event.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="grid gap-1">
          링크 주소
          <AdminInput
            ref={hrefInput}
            inputMode="url"
            value={href}
            aria-invalid={error?.field === 'href' || undefined}
            aria-describedby={error?.field === 'href' ? errorId : undefined}
            onChange={event => {
              setHref(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error && (
          <p id={errorId} role="alert" className="text-cherry-700">
            {error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={menuItemVariants({ active: true })} onClick={submit}>
            링크 적용
          </button>
          {initialHref !== undefined && (
            <button
              type="button"
              className={menuItemVariants()}
              onClick={() => {
                const message = onApply(null);
                if (message) setError({ message });
              }}
            >
              링크 해제
            </button>
          )}
          <button type="button" className={menuItemVariants()} onClick={onCancel}>
            링크 편집 취소
          </button>
        </div>
      </fieldset>
    </div>
  );
}
