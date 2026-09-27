'use client';

import { Button, Tag, X } from '@darun/ui';
import { AdminInput } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(
  useProductTagsForm,
  ({ inputValue, tags, handleInputChange, removeTag, applyTags, isSaving, isLoading }) => {
    const isBusy = isSaving || isLoading;

    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          applyTags();
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <AdminInput
              className="w-full"
              value={inputValue}
              disabled={isBusy}
              onChange={event => handleInputChange(event.target.value)}
              placeholder="태그를 쉼표(,)로 구분하여 입력하세요. (예: 핀테크, 결제, 금융)"
            />
          </div>
          <Button type="submit" variant="contained" color="primary" disabled={isBusy}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-dark-500 font-medium mr-1">
              <Tag size={13} className="text-dark-400 shrink-0" aria-hidden="true" />
              적용될 태그 (<span className="tabular-nums">{tags.length}</span>):
            </span>
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-dark-100 text-dark-800 border border-dark-200"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={isBusy}
                  className="text-dark-400 hover:text-dark-700 ml-0.5 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dark-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`${tag} 태그 제거`}
                  aria-label={`${tag} 태그 제거`}
                >
                  <X size={12} className="shrink-0" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </form>
    );
  }
);
