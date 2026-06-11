'use client';

import { bind } from '@croco/utils-structure-react';
import { AdminActions, AdminField, AdminInput } from '@darun/ui-admin';
import React from 'react';
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
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          key={form.key('startAtIsDisabled')}
          {...form.getInputProps('startAtIsDisabled')}
          className="w-4 h-4 text-dark-900 border-dark-200 rounded focus:ring-dark-900/20"
        />
        <label className="text-sm text-dark-900">개업일 미상 (체크 시 위 개업일은 무시됨)</label>
      </div>
    </div>

    <AdminActions>
      <button
        type="submit"
        className="px-4 py-2 bg-dark-900 text-white text-sm font-medium rounded-lg hover:bg-dark-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/20"
      >
        저장
      </button>
    </AdminActions>
  </form>
));
