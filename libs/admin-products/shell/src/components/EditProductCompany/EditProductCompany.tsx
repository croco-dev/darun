import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { useEditProductCompany } from './useEditProductCompany';
import { Button, Group, Select, Stack } from '@mantine/core';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(
  useEditProductCompany,
  ({ form, handleSubmit, companies, searchValue, handleSearchChange }) => {
    return (
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-dark-900">
            <span>회사</span>
            <select
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm text-dark-900 outline-none transition focus:border-dark-900"
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
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="contained" color="secondary">
            저장
          </Button>
        </div>
      </form>
    );
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap={'8px'}>
          <Select
            label="회사"
            placeholder="회사 이름을 검색하세요."
            data={companies}
            searchable
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            value={form.getValues().companyId}
            onChange={value => form.setFieldValue('companyId', value || '')}
          />
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button type="submit" color={'dark'}>
            저장
          </Button>
        </Group>
      </form>
    );
  }
);
