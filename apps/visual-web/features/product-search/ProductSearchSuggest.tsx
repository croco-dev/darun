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
  const listboxId = `${inputId}-suggest-listbox`;

  const isOpen = suggestions.length > 0 || (inputValue.trim().length > 0 && isSearching);

  // Sync latest callbacks into refs via effect (not during render)
  const callbacksRef = useRef({ onSelect, onClose });
  useEffect(() => {
    callbacksRef.current = { onSelect, onClose };
  }, [onSelect, onClose]);

  // Reset activeIndex when suggestions list changes
  const prevSuggestionsRef = useRef(suggestions);
  useEffect(() => {
    if (prevSuggestionsRef.current !== suggestions) {
      prevSuggestionsRef.current = suggestions;
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

  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Keyboard navigation attached to the input element
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function handleKeyDown(event: KeyboardEvent) {
      const items = callbacksRef.current;

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

    input.addEventListener('keydown', handleKeyDown);
    return () => input.removeEventListener('keydown', handleKeyDown);
  }, [inputRef, suggestions]);

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
