'use client';

import { Button } from '@darun/ui';
import { Editor, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductDescription, type UseEditProductDescriptionProps } from './useEditProductDescription';

const EditProductDescriptionForm = bind(
  useEditProductDescription,
  ({
    form,
    submit,
    onCancel,
    loading,
    imageUploading,
    onImageUploadingChange,
    saveError,
    hasServerChange,
    acceptLatestDescription,
    overwriteWithDraft,
  }) => (
    <form onSubmit={form.onSubmit(submit)} className="max-h-[75vh] overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Editor
          {...form.getInputProps('description')}
          disabled={loading}
          editable={!loading}
          onImageUploadingChange={onImageUploadingChange}
        />
      </div>
      {imageUploading && (
        <p role="status" className="mt-3 text-sm text-dark-600">
          본문 이미지를 업로드하고 있습니다. 완료 후 저장할 수 있습니다.
        </p>
      )}
      {hasServerChange && (
        <div role="alert" className="mt-3 rounded-lg border border-dark-200 p-3 text-sm text-dark-800">
          <p>저장된 소개가 변경되었습니다. 작성 중인 초안은 보관했습니다.</p>
          <p className="mt-1">최신 본문을 사용하거나, 현재 초안으로 저장된 소개를 덮어쓸 수 있습니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="contained"
              color="secondary"
              onClick={acceptLatestDescription}
              disabled={loading || imageUploading}
            >
              초안을 버리고 최신 본문 사용
            </Button>
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={overwriteWithDraft}
              disabled={loading || imageUploading}
            >
              초안으로 덮어쓰기
            </Button>
          </div>
        </div>
      )}
      {saveError && (
        <p role="alert" className="mt-2 text-sm text-cherry-700">
          {saveError} 입력한 내용은 유지됩니다.
        </p>
      )}

      <AdminActions>
        {onCancel && (
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="active:scale-[0.98] motion-reduce:transform-none"
            onClick={onCancel}
            disabled={loading || imageUploading}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          className="active:scale-[0.98] motion-reduce:transform-none"
          disabled={loading || imageUploading || hasServerChange}
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
      </AdminActions>
    </form>
  )
);

export function EditProductDescription(props: UseEditProductDescriptionProps) {
  return <EditProductDescriptionForm key={props.slug} {...props} />;
}
