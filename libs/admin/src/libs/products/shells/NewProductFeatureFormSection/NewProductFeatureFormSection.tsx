'use client';

import { Button, Stack, TextInput } from '@mantine/core';
import { NewProductFeatureForm } from '../../components/NewProductFeatureForm';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};
export const NewProductFeatureFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductFeatureForm productSlug={productSlug}>
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
        <TextInput name="emoji" size="md" radius="xl" label="emoji" {...form.getInputProps('emoji')} />
        <TextInput name="summary" size="md" radius="xl" label="짧은 설명" {...form.getInputProps('summary')} />
        <Button type="submit">등록</Button>
      </Stack>
    )}
  </NewProductFeatureForm>
);
