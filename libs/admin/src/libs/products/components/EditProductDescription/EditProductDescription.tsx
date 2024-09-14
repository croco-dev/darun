import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack } from '@mantine/core';
import { Editor } from '@uis';
import { useEditProductDescription } from './useEditProductDescription';

export const EditProductDescription = bind(useEditProductDescription, ({ form, submit, defaultValue }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <Stack gap={'8px'}>
      <Editor {...form.getInputProps('description')} defaultValue={defaultValue} />
    </Stack>

    <Group justify="flex-end" mt="md">
      <Button type="submit" color={'dark'}>
        저장
      </Button>
    </Group>
  </form>
));
