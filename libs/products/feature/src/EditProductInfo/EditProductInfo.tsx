'use client';

import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductInfo } from './useEditProductInfo';

export const EditProductInfo = bind(useEditProductInfo, ({ form, submit, onCancel, loading }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-3">
      <AdminField label="서비스 이름" error={form.errors.name}>
        <AdminInput disabled={loading} placeholder="ex) 다른" key={form.key('name')} {...form.getInputProps('name')} />
      </AdminField>
      <AdminField label="서비스 요약 (summary)" error={form.errors.summary}>
        <AdminTextarea
          disabled={loading}
          placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
          key={form.key('summary')}
          {...form.getInputProps('summary')}
        />
      </AdminField>
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
));
