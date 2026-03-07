'use client';

import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack, Textarea, TextInput } from '@mantine/core';
import { useEditProductInfo } from './useEditProductInfo';

export const EditProductInfo = bind(useEditProductInfo, ({ form, submit }) => (
  <form onSubmit={form.onSubmit(submit)}>
    <Stack gap={'8px'}>
      <TextInput label="서비스 이름" placeholder="ex) 다른" key={form.key('name')} {...form.getInputProps('name')} />
      <Textarea
        label="서비스 요악 (summary)"
        placeholder="ex) 다른에서 여러가지 서비스를 비교, 분석해보세요."
        key={form.key('summary')}
        {...form.getInputProps('summary')}
      />
    </Stack>

    <Group justify="flex-end" mt="md">
      <Button type="submit" color={'dark'}>
        저장
      </Button>
    </Group>
  </form>
));
