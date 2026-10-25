'use client';

import { Button } from '@darun/ui';
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminActions,
  AdminLoadingState,
  AdminErrorState,
  AdminEmptyState,
} from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(
  useEditAlternativeProducts,
  ({
    alternativeIds,
    setAlternativeIds,
    submit,
    onCancel,
    selectData,
    updateQuery,
    loading,
    isLoading,
    isReady,
    isNotFound,
    error,
    retry,
  }) => (
    <form
      onSubmit={event => {
        event.preventDefault();
        void submit();
      }}
    >
      {isLoading ? (
        <AdminLoadingState title="대안 서비스를 불러오는 중..." />
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
      <div className="flex flex-col gap-3">
        <AdminField label="서비스 검색">
          <AdminInput type="text" placeholder="ex) 토스" onChange={updateQuery} disabled={loading || !isReady} />
        </AdminField>
        <AdminField label="다른 서비스 (alternatives)">
          <AdminSelect
            multiple
            disabled={loading || !isReady}
            value={alternativeIds}
            onChange={e => {
              const selected = Array.from(e.currentTarget.selectedOptions, o => o.value);
              setAlternativeIds(selected);
            }}
          >
            {selectData.flatMap(group =>
              group.items.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </AdminSelect>
        </AdminField>
      </div>

      <AdminActions>
        {onCancel && (
          <Button
            type="button"
            variant="contained"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
            className="active:scale-[0.98] motion-reduce:transform-none"
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !isReady}
          className="active:scale-[0.98] motion-reduce:transform-none"
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
      </AdminActions>
    </form>
  )
);
