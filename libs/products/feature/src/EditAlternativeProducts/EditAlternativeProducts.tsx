import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminActions } from '@darun/ui-admin';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(useEditAlternativeProducts, ({ form, submit, selectData, updateQuery }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-3">
      <AdminField label="서비스 검색">
        <AdminInput
          type="text"
          placeholder="ex) 토스"
          onChange={updateQuery}
        />
      </AdminField>
      <AdminField label="다른 서비스 (alternatives)">
        <select
          multiple
          className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900 focus-visible:ring-2 focus-visible:ring-dark-900/20"
          key={form.key('alternativeIds')}
          {...form.getInputProps('alternativeIds')}
        >
          {selectData.flatMap(group =>
            group.items.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </AdminField>
    </div>

    <AdminActions>
      <Button type="submit" variant="contained" color="primary">
        저장
      </Button>
    </AdminActions>
  </form>
));
