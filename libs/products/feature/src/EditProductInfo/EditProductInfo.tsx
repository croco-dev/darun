'use client';

import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEffect, useId, useRef } from 'react';
import { useEditProductInfo } from './useEditProductInfo';

function EditProductInfoForm({
  form,
  submit,
  onCancel,
  loading,
  readState,
  canEdit,
  retryRead,
}: ReturnType<typeof useEditProductInfo>) {
  const formElement = useRef<HTMLFormElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const retryId = useId();

  useEffect(() => {
    if (document.activeElement !== formElement.current) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== formElement.current) return;
      if (readState === 'error') document.getElementById(retryId)?.focus();
      if (canEdit) nameInput.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [readState, canEdit, retryId]);

  return (
    <form ref={formElement} tabIndex={-1} className="focus:outline-none" onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-3">
        {readState === 'loading' && (
          <p role="status" className="text-sm text-dark-500">
            기본 정보를 불러오는 중…
          </p>
        )}
        {readState === 'missing' && (
          <p role="status" className="text-sm text-dark-500">
            수정할 서비스를 찾을 수 없습니다.
          </p>
        )}
        {readState === 'error' && (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-cherry-700">
              기본 정보를 불러오지 못했습니다.
            </p>
            <Button
              id={retryId}
              type="button"
              variant="base"
              color="secondary"
              size="sm"
              onClick={event => {
                if (document.activeElement === event.currentTarget) formElement.current?.focus();
                void retryRead();
              }}
            >
              다시 불러오기
            </Button>
          </div>
        )}
        <AdminField label="서비스 이름" error={form.errors.name}>
          <AdminInput
            ref={nameInput}
            disabled={!canEdit}
            placeholder="ex) 다른"
            key={form.key('name')}
            {...form.getInputProps('name')}
          />
        </AdminField>
        <AdminField label="서비스 요약 (summary)" error={form.errors.summary}>
          <AdminTextarea
            disabled={!canEdit}
            placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
            key={form.key('summary')}
            {...form.getInputProps('summary')}
          />
        </AdminField>
        <AdminField label="로고 주소" error={form.errors.logoUrl}>
          <AdminInput
            disabled={!canEdit}
            inputMode="url"
            key={form.key('logoUrl')}
            {...form.getInputProps('logoUrl')}
          />
        </AdminField>
      </div>

      <AdminActions>
        {onCancel && (
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="active:scale-[0.98] motion-reduce:transform-none"
            onClick={onCancel}
            disabled={loading}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          className="active:scale-[0.98] motion-reduce:transform-none"
          disabled={!canEdit}
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
      </AdminActions>
    </form>
  );
}

export const EditProductInfo = bind(useEditProductInfo, EditProductInfoForm);
