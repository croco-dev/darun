'use client';

import { Button } from '@darun/ui';
import { AdminField, AdminInput, AdminTextarea, AdminActions } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductInfo } from './useEditProductInfo';

export const EditProductInfo = bind(useEditProductInfo, ({ form, submit }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <div className="flex flex-col gap-3">
      <AdminField label="서비스 이름">
        <AdminInput placeholder="ex) 다른" key={form.key('name')} {...form.getInputProps('name')} />
      </AdminField>
      <AdminField label="서비스 요약 (summary)">
        <AdminTextarea
          placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
          key={form.key('summary')}
          {...form.getInputProps('summary')}
        />
      </AdminField>
    </div>

    <AdminActions>
      <Button type="submit" variant="contained" color="primary">
        저장
      </Button>
    </AdminActions>
  </form>
));
