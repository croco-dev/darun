import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { useEditProductCompany } from './useEditProductCompany';

export const EditProductCompany = bind(useEditProductCompany, ({ form, handleSubmit }) => (
  <form onSubmit={form.onSubmit(handleSubmit)}>
    <Stack gap={'8px'}>
      <TextInput
        label="회사 ID"
        placeholder="ex) 01J8H7WF8CPNB7Y6RZXC26B1MA"
        key={form.key('id')}
        {...form.getInputProps('id')}
      />
    </Stack>

    <Group justify="flex-end" mt="md">
      <Button type="submit" color={'dark'}>
        저장
      </Button>
    </Group>
  </form>
));
