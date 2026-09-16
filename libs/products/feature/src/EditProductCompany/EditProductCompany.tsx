'use client';

import { Button } from '@darun/ui';
import { AdminField, AdminSelect, AdminActions, AdminInput } from '@darun/ui-admin';
import { bind } from '@darun/utils-structure-react';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(
  useEditProductCompany,
  ({ form, handleSubmit, companies, searchValue, handleSearchChange, loading }) => {
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-3">
          <AdminField label="회사" error={form.errors.companyId}>
            <div className="flex flex-col gap-2">
              <AdminInput
                placeholder="회사 이름을 검색하세요"
                value={searchValue}
                disabled={loading}
                onChange={e => handleSearchChange(e.target.value)}
              />
              <AdminSelect key={form.key('companyId')} disabled={loading} {...form.getInputProps('companyId')}>
                <option value="">선택하세요</option>
                {companies.map(company => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </AdminField>
        </div>

        <AdminActions>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </AdminActions>
      </form>
    );
  }
);
