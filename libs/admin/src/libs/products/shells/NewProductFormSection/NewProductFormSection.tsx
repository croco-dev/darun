'use client';

import { Button, Stack, TextInput } from '@mantine/core';
import { NewProductForm } from '../../components/NewProductForm';

export const NewProductFormSection = () => (
  <NewProductForm>
    {({ form }) => (
      <Stack>
        <TextInput
          name="name"
          size="md"
          radius="xl"
          label="이름"
          form="new-product-form"
          {...form.getInputProps('name')}
        />
        <TextInput name="slug" size="md" radius="xl" label="slug" {...form.getInputProps('slug')} />
        <TextInput name="summary" size="md" radius="xl" label="짧은 설명" {...form.getInputProps('summary')} />
        <TextInput name="logoUrl" size="md" radius="xl" label="logo Url" {...form.getInputProps('logoUrl')} />
        <Button type="submit">등록</Button>
      </Stack>
    )}
  </NewProductForm>
);
