'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ImageCaption } from './CaptionedImage';
import { isCompleteLinkAddress } from './linkAddress';
import { menuItemVariants } from './MenuItem';

type ImageCaptionFieldsProps = {
  initial: ImageCaption;
  disabled: boolean;
  onApply: (caption: ImageCaption) => void;
  onCancel: () => void;
};

const inputClass = 'min-w-0 rounded-md border border-dark-200 px-2 py-1.5';

export function ImageCaptionFields({ initial, disabled, onApply, onCancel }: ImageCaptionFieldsProps) {
  const [draft, setDraft] = useState(initial);
  const [invalidAddress, setInvalidAddress] = useState(false);
  const captionRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => captionRef.current?.focus(), []);

  function apply() {
    if (disabled) return;
    const creditUrl = draft.creditUrl.trim();
    if (creditUrl && !isCompleteLinkAddress(creditUrl)) {
      setInvalidAddress(true);
      addressRef.current?.focus();
      return;
    }
    onApply({
      caption: draft.caption.trim(),
      credit: draft.credit.trim(),
      creditUrl,
    });
  }

  return (
    <fieldset
      disabled={disabled}
      className="grid min-w-0 gap-3 rounded-lg border border-dark-200 p-3 text-sm"
      onKeyDownCapture={event => {
        if (event.key !== 'Escape' || disabled) return;
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
        event.preventDefault();
        if (!event.nativeEvent.isComposing) apply();
      }}
    >
      <legend className="px-1 font-medium">이미지 캡션·출처 편집</legend>
      <label className="grid gap-1">
        캡션
        <input
          ref={captionRef}
          value={draft.caption}
          onChange={event => setDraft({ ...draft, caption: event.target.value })}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        출처 이름
        <input
          value={draft.credit}
          onChange={event => setDraft({ ...draft, credit: event.target.value })}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1">
        출처 주소
        <input
          ref={addressRef}
          inputMode="url"
          value={draft.creditUrl}
          onChange={event => {
            setDraft({ ...draft, creditUrl: event.target.value });
            setInvalidAddress(false);
          }}
          aria-invalid={invalidAddress}
          aria-describedby={invalidAddress ? errorId : undefined}
          className={inputClass}
        />
      </label>
      {invalidAddress && (
        <p role="alert" id={errorId} className="text-cherry-700">
          http:// 또는 https://로 시작하는 전체 주소를 입력해 주세요.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={menuItemVariants({ active: true })} onClick={apply}>
          캡션·출처 적용
        </button>
        <button type="button" className={menuItemVariants()} onClick={onCancel}>
          캡션·출처 편집 취소
        </button>
      </div>
    </fieldset>
  );
}
