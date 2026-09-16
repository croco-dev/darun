'use client';

import { Button } from '@darun/ui';
import { AdminInput } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { Tag, X } from 'lucide-react';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(
  useProductTagsForm,
  ({ inputValue, tags, handleInputChange, removeTag, applyTags, isSaving, isLoading }) => {
    const isBusy = isSaving || isLoading;

    return (
      <div className="flex flex-col gap-3">
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
          <Button onClick={applyTags} variant="contained" color="primary" disabled={isBusy}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-xs text-dark-500 font-medium mr-1">
              <Tag size={13} className="text-dark-400" />
              적용될 태그 ({tags.length}):
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
                  className="text-dark-400 hover:text-dark-700 ml-0.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`${tag} 태그 제거`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
);
