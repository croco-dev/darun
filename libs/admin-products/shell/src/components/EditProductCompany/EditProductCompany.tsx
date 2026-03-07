import { bind } from '@croco/utils-structure-react';
import { Button, Group, Select, Stack } from '@mantine/core';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(
  useEditProductCompany,
  ({ form, handleSubmit, companies, searchValue, handleSearchChange }) => {
    return (
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
