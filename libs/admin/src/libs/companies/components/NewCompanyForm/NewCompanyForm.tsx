'use client';

import { bind } from '@croco/utils-structure-react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useNewCompanyForm } from './useNewCompanyForm';

export const NewCompanyForm = bind(useNewCompanyForm, ({ form, handleSubmit }) => (
  <form onSubmit={form.onSubmit(handleSubmit)}>
    <Stack gap={'8px'}>
      <TextInput
        label="회사 이름"
        placeholder="ex) 네이버 주식회사"
        key={form.key('name')}
        {...form.getInputProps('name')}
      />
      <TextInput label="유형" placeholder="ex) 비상장 법인" key={form.key('type')} {...form.getInputProps('type')} />
      <TextInput
        label="주소"
        placeholder="ex) 서울 강남"
        key={form.key('address')}
        {...form.getInputProps('address')}
      />
      <DateInput
        key={form.key('startAt')}
        {...form.getInputProps('startAt')}
        label="개업일"
        placeholder="눌러서 선택해주세요."
      />
    </Stack>

    <Group justify="flex-end" mt="md">
      <Button type="submit" color={'dark'}>
        저장
      </Button>
    </Group>
  </form>
));
