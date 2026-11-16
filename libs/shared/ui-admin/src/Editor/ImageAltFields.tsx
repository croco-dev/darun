'use client';

import { useEffect, useRef, useState } from 'react';
import { menuItemVariants } from './MenuItem';

type ImageAltFieldsProps = {
  initialAlt: string | null;
  adding: boolean;
  disabled: boolean;
  onConfirm: (alt: string) => void;
  onCancel: () => void;
};

export function ImageAltFields({ initialAlt, adding, disabled, onConfirm, onCancel }: ImageAltFieldsProps) {
  const [description, setDescription] = useState(initialAlt ?? '');
  const [decorative, setDecorative] = useState(initialAlt === '');
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const alt = decorative ? '' : description.trim();
  const canConfirm = !disabled && (decorative || alt.length > 0);

  useEffect(() => {
    fieldsetRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
  }, []);

  return (
    <fieldset
      ref={fieldsetRef}
      disabled={disabled}
      className="grid min-w-0 gap-3 rounded-lg border border-dark-200 p-3 text-sm"
      onKeyDownCapture={event => {
        if (event.key !== 'Escape' || disabled) return;
        // Keep Escape from reaching the surrounding modal's document listener.
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (canConfirm) onConfirm(alt);
        }
      }}
    >
      <legend className="px-1 font-medium">{adding ? '본문 이미지 삽입' : '본문 이미지 대체 텍스트 수정'}</legend>
      <label className="grid gap-1">
        대체 텍스트
        <input
          type="text"
          value={description}
          disabled={decorative}
          onChange={event => setDescription(event.target.value)}
          className="min-w-0 rounded-md border border-dark-200 px-2 py-1.5 disabled:opacity-50"
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={decorative} onChange={event => setDecorative(event.target.checked)} />
        장식용 이미지
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={menuItemVariants({ active: true })}
          disabled={!canConfirm}
          onClick={() => onConfirm(alt)}
        >
          {adding ? '이미지 삽입' : '대체 텍스트 적용'}
        </button>
        <button type="button" className={menuItemVariants()} onClick={onCancel}>
          이미지 편집 취소
        </button>
      </div>
    </fieldset>
  );
}
