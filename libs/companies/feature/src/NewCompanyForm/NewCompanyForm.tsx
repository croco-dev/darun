'use client';

import { Button } from '@darun/ui';
import { AdminActions, AdminField, AdminInput, AdminCheckbox } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useNewCompanyForm } from './useNewCompanyForm';

export const NewCompanyForm = bind(useNewCompanyForm, ({ form, handleSubmit }) => (
  <form onSubmit={form.onSubmit(handleSubmit)}>
    <div className="flex flex-col gap-4">
      <AdminField label="회사 이름" error={form.errors.name}>
        <AdminInput
          type="text"
          placeholder="ex) 네이버 주식회사"
          key={form.key('name')}
          {...form.getInputProps('name')}
        />
      </AdminField>
      <AdminField label="유형" error={form.errors.type}>
        <AdminInput type="text" placeholder="ex) 비상장 법인" key={form.key('type')} {...form.getInputProps('type')} />
      </AdminField>
      <AdminField label="주소" error={form.errors.address}>
        <AdminInput
          type="text"
          placeholder="ex) 서울 강남"
          key={form.key('address')}
          {...form.getInputProps('address')}
        />
      </AdminField>
      <AdminField label="개업일">
        <AdminInput
          type="date"
          key={form.key('startAt')}
          {...form.getInputProps('startAt')}
          placeholder="눌러서 선택해주세요."
          disabled={Boolean(form.getValues().startAtIsDisabled)}
        />
      </AdminField>
      <AdminCheckbox
        id="startAtIsDisabled"
        label="개업일 미상 (체크 시 위 개업일은 무시됨)"
        key={form.key('startAtIsDisabled')}
        {...form.getInputProps('startAtIsDisabled', { type: 'checkbox' })}
      />
    </div>

    <AdminActions>
      <Button type="submit" variant="contained" color="primary">
        저장
      </Button>
    </AdminActions>
  </form>
));
