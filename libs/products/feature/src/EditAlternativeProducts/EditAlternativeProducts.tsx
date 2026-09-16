'use client';

import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(
  useEditAlternativeProducts,
  ({ form, submit, onCancel, selectData, updateQuery, loading }) => (
    <form onSubmit={form.onSubmit(submit)}>
      <div className="flex flex-col gap-3">
        <AdminField label="서비스 검색">
          <AdminInput type="text" placeholder="ex) 토스" onChange={updateQuery} disabled={loading} />
        </AdminField>
        <AdminField label="다른 서비스 (alternatives)">
          <AdminSelect
            multiple
            disabled={loading}
            key={form.key('alternativeIds')}
            {...form.getInputProps('alternativeIds')}
            onChange={e => {
              const selected = Array.from(e.currentTarget.selectedOptions, o => o.value);
              form.setFieldValue('alternativeIds', selected);
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
