import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { AdminField, AdminActions } from '@darun/ui-admin';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(
  useEditProductCompany,
  ({ form, handleSubmit, companies, searchValue, handleSearchChange }) => {
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-3">
          <AdminField label="회사">
            <select
              className="w-full rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900 focus-visible:ring-2 focus-visible:ring-dark-900/20"
              value={form.getValues().companyId}
              onChange={e => form.setFieldValue('companyId', e.target.value)}
            >
              <option value="">회사 이름을 검색하세요.</option>
              {companies.map(company => (
                <option key={company.value} value={company.value}>
                  {company.label}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        <AdminActions>
          <Button type="submit" variant="contained" color="primary">
            저장
          </Button>
        </AdminActions>
      </form>
    );
  }
);
