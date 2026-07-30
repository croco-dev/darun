import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminSelect, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(useEditAlternativeProducts, ({ form, submit, selectData, updateQuery }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-3">
      <AdminField label="서비스 검색">
        <AdminInput type="text" placeholder="ex) 토스" onChange={updateQuery} />
      </AdminField>
      <AdminField label="다른 서비스 (alternatives)">
        <AdminSelect multiple key={form.key('alternativeIds')} {...form.getInputProps('alternativeIds')}>
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
      <Button type="submit" variant="contained" color="primary">
        저장
      </Button>
    </AdminActions>
  </form>
));
