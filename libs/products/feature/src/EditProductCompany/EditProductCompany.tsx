import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { AdminField, AdminSelect, AdminActions, AdminInput } from '@darun/ui-admin';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(
  useEditProductCompany,
  ({ form, handleSubmit, companies, searchValue, handleSearchChange }) => {
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-3">
          <AdminField label="회사">
            <div className="flex flex-col gap-2">
              <AdminInput
                placeholder="회사 이름을 검색하세요"
                value={searchValue}
                onChange={e => handleSearchChange(e.target.value)}
              />
              <AdminSelect
                value={form.getValues().companyId}
                onChange={e => form.setFieldValue('companyId', e.target.value)}
              >
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
          <Button type="submit" variant="contained" color="primary">
            저장
          </Button>
        </AdminActions>
      </form>
    );
  }
);
