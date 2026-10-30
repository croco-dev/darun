'use client';

import { Button, Tag, X } from '@darun/ui';
import { AdminEmptyState, AdminErrorState, AdminInput, AdminLoadingState } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useId } from 'react';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(
  useProductTagsForm,
  ({ tags, changeTag, addTag, removeTag, applyTags, isSaving, isLoading, isReady, isNotFound, error, retry }) => {
    const isBusy = isSaving || !isReady;
    const hintId = useId();

    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          applyTags();
        }}
        className="flex flex-col gap-3"
      >
        {isLoading ? (
          <AdminLoadingState title="태그를 불러오는 중..." />
        ) : error ? (
          <AdminErrorState
            error={error}
            action={
              <Button type="button" onClick={retry}>
                다시 시도
              </Button>
            }
          />
        ) : isNotFound ? (
          <AdminEmptyState title="상품을 찾을 수 없습니다." />
        ) : null}
        <div className="flex items-center gap-1 text-xs text-dark-500 font-medium">
          <Tag size={13} className="text-dark-400 shrink-0" aria-hidden="true" />
          태그
        </div>
        <p id={hintId} className="text-xs text-dark-500">
          태그를 하나씩 입력하세요. 쉼표도 이름에 포함됩니다.
        </p>
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-2">
            <AdminInput
              className="w-full min-w-0 flex-1"
              aria-label={`태그 ${index + 1}`}
              aria-describedby={hintId}
              value={tag}
              disabled={isBusy}
              onChange={event => changeTag(index, event.target.value)}
              placeholder="태그 이름"
            />
            <button
              type="button"
              onClick={() => removeTag(index)}
              disabled={isBusy}
              className="text-dark-400 hover:text-dark-700 rounded-md p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center transition-colors active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dark-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`${tag || `태그 ${index + 1}`} 제거`}
              aria-label={`${tag || `태그 ${index + 1}`} 제거`}
            >
              <X size={16} className="shrink-0" aria-hidden="true" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={addTag} disabled={isBusy}>
            태그 추가
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isBusy}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    );
  }
);
