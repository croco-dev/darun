import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack, Textarea } from '@mantine/core';
import { useEditProductDescription } from './useEditProductDescription';

export const EditProductDescription = bind(useEditProductDescription, ({ form, submit }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <Stack gap={'8px'}>
      <Textarea
        label="서비스 요악 (summary)"
        placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
        key={form.key('description')}
        {...form.getInputProps('description')}
      />
    </Stack>

    <Group justify="flex-end" mt="md">
      <Button type="submit" color={'dark'}>
        저장
      </Button>
    </Group>
  </form>
));
