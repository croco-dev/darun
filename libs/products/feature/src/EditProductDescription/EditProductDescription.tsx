'use client';

import { Button } from '@darun/ui';
import { Editor, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductDescription } from './useEditProductDescription';

export const EditProductDescription = bind(
  useEditProductDescription,
  ({ form, submit, onCancel, defaultValue, loading }) => (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-2">
        <Editor
          {...form.getInputProps('description')}
          defaultValue={defaultValue}
          disabled={loading}
          editable={!loading}
        />
      </div>

      <AdminActions>
        {onCancel && (
          <Button type="button" variant="contained" color="secondary" onClick={onCancel} disabled={loading}>
            취소
          </Button>
        )}
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? '저장 중...' : '저장'}
        </Button>
      </AdminActions>
    </form>
  )
);
