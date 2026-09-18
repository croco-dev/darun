'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
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
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        callbacksRef.current.onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Keyboard navigation attached to the input element
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function handleKeyDown(event: KeyboardEvent) {
      const items = callbacksRef.current;

      if (event.key === 'ArrowDown') {
        setActiveIndex(prev => {
          if (suggestions.length === 0) return prev;
          event.preventDefault();
          return prev < suggestions.length - 1 ? prev + 1 : 0;
        });
      } else if (event.key === 'ArrowUp') {
        setActiveIndex(prev => {
          if (suggestions.length === 0) return prev;
          event.preventDefault();
          return prev > 0 ? prev - 1 : suggestions.length - 1;
        });
      } else if (event.key === 'Enter') {
        // Read activeIndex from DOM to avoid stale closure
        setActiveIndex(prev => {
          if (prev >= 0 && prev < suggestions.length) {
            event.preventDefault();
            items.onSelect(suggestions[prev]);
          }
          return prev;
        });
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
    <div ref={containerRef} className="absolute left-0 right-0 top-full z-30 mt-1.5">
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
              className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
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
                className="size-6 rounded-md object-contain"
                onError={event => {
                  const img = event.currentTarget;
                  if (img.src !== DEFAULT_ICON) {
                    img.src = DEFAULT_ICON;
                  }
                }}
              />
              <span className="truncate">{suggestion.name}</span>
            </li>
          ))}
        </ul>
      ) : showLoading ? (
        <div className="rounded-xl border border-dark-150 bg-white px-3.5 py-2.5 text-sm text-dark-400 shadow-lg">
          검색 중...
        </div>
      ) : null}
    </div>
  );
}
