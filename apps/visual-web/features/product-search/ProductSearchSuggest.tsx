'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';
import type { ProductSuggestion } from './useProductSearchSuggest';

const DEFAULT_ICON = '/images/default-product-icon.svg';

type ProductSearchSuggestProps = {
  inputId: string;
  inputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  suggestions: ProductSuggestion[];
  isSearching: boolean;
  onSelect: (product: ProductSuggestion) => void;
  onClose: () => void;
};

export function ProductSearchSuggest({
  inputId,
  inputRef,
  inputValue,
  suggestions,
  isSearching,
  onSelect,
  onClose,
}: ProductSearchSuggestProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(activeIndex);
  const listboxId = `${inputId}-suggest-listbox`;

  const isOpen = suggestions.length > 0 || (inputValue.trim().length > 0 && isSearching);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (isOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
      input.setAttribute('aria-activedescendant', `${inputId}-suggest-option-${activeIndex}`);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
    return () => input.removeAttribute('aria-activedescendant');
  }, [activeIndex, inputId, inputRef, isOpen, suggestions]);
  // Sync latest callbacks into refs via effect (not during render)
  const callbacksRef = useRef({ onSelect, onClose });
  useEffect(() => {
    callbacksRef.current = { onSelect, onClose };
  }, [onSelect, onClose]);

  // Reset activeIndex when suggestions list changes
  const suggestionsRef = useRef(suggestions);
  useEffect(() => {
    if (suggestionsRef.current !== suggestions) {
      suggestionsRef.current = suggestions;
      activeIndexRef.current = -1;
      setActiveIndex(-1);
    }
  }, [suggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        callbacksRef.current.onClose();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Track the confirmation key even when focus moves within the form.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const form = input.form;
    const keyboardTarget: HTMLElement = form ?? input;
    const ownerDocument = input.ownerDocument;
    let confirmingComposition = false;

    function isEnterKey(event: KeyboardEvent) {
      return event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter';
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isEnterKey(event)) confirmingComposition = false;
    }

    function guardImplicitClick(event: MouseEvent) {
      if (
        !confirmingComposition ||
        ownerDocument.activeElement !== input ||
        event.detail !== 0 ||
        !(event.target instanceof Element) ||
        !event.target.closest('button[type="submit"]')
      ) {
        return;
      }
      // Stop implicit activation before it reaches the outside-click listener.
      event.preventDefault();
      event.stopPropagation();
    }

    function guardSubmit(event: SubmitEvent) {
      if (!confirmingComposition || event.submitter) return;
      event.preventDefault();
      event.stopPropagation();
    }

    function handleKeyDown(event: KeyboardEvent) {
      const fromSearchInput = event.target === input;
      // Some browsers report the confirmation key after compositionend, with keyCode 229.
      const isImeKey = event.isComposing || event.keyCode === 229;
      if (isEnterKey(event)) {
        confirmingComposition = (fromSearchInput && isImeKey) || (event.repeat && confirmingComposition);
        if (confirmingComposition) {
          // Leave composition to the IME, but a held Enter must not activate form controls.
          if (!fromSearchInput || !isImeKey) event.preventDefault();
          return;
        }
      }
      if (!fromSearchInput || isImeKey) return;

      const items = callbacksRef.current;
      const suggestions = suggestionsRef.current;

      if (event.key === 'ArrowDown') {
        if (suggestions.length === 0) return;
        event.preventDefault();
        const next = activeIndexRef.current < suggestions.length - 1 ? activeIndexRef.current + 1 : 0;
        activeIndexRef.current = next;
        setActiveIndex(next);
      } else if (event.key === 'ArrowUp') {
        if (suggestions.length === 0) return;
        event.preventDefault();
        const next = activeIndexRef.current > 0 ? activeIndexRef.current - 1 : suggestions.length - 1;
        activeIndexRef.current = next;
        setActiveIndex(next);
      } else if (event.key === 'Enter') {
        const currentIdx = activeIndexRef.current;
        if (currentIdx >= 0 && currentIdx < suggestions.length) {
          event.preventDefault();
          items.onSelect(suggestions[currentIdx]);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        items.onClose();
      }
    }

    // Guard implicit submission without canceling the IME's keydown default action.
    keyboardTarget.addEventListener('keydown', handleKeyDown);
    ownerDocument.addEventListener('keyup', handleKeyUp, true);
    form?.addEventListener('click', guardImplicitClick, true);
    form?.addEventListener('submit', guardSubmit, true);
    return () => {
      keyboardTarget.removeEventListener('keydown', handleKeyDown);
      ownerDocument.removeEventListener('keyup', handleKeyUp, true);
      form?.removeEventListener('click', guardImplicitClick, true);
      form?.removeEventListener('submit', guardSubmit, true);
    };
  }, [inputRef]);

  const hasResults = suggestions.length > 0;
  const showLoading = !hasResults && inputValue.trim().length > 0 && isSearching;

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="relative z-30 mt-2 lg:absolute lg:top-full lg:right-0 lg:left-0">
      {hasResults ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="서비스 검색 제안"
          className="overflow-hidden rounded-xl border border-dark-150 bg-white shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${inputId}-suggest-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm select-none transition-colors ${
                index === activeIndex ? 'bg-surface-100 text-dark-900' : 'text-dark-700 hover:bg-surface-50'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={event => {
                event.preventDefault();
                onSelect(suggestion);
              }}
            >
              <img
                src={suggestion.logoUrl || DEFAULT_ICON}
                alt=""
                loading={VISUAL_CARD_IMAGE_LOADING}
                className="size-6 shrink-0 rounded-md object-contain"
                onError={event => {
                  const img = event.currentTarget;
                  if (!img.src.endsWith(DEFAULT_ICON)) {
                    img.src = DEFAULT_ICON;
                  }
                }}
              />
              <span className="truncate">{suggestion.name}</span>
            </li>
          ))}
        </ul>
      ) : showLoading ? (
        <div className="flex min-h-11 items-center rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-600 shadow-lg select-none">
          검색 중...
        </div>
      ) : null}
    </div>
  );
}
