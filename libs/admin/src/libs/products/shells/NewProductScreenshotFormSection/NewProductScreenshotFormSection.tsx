'use client';

import { Button, Stack, TextInput } from '@mantine/core';
import { NewProductScreenForm } from '@products/components';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};
export const NewProductScreenshotFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductScreenForm productSlug={productSlug}>
    {({ form }) => (
      <Stack>
        <TextInput name="imageUrl" size="md" radius="xl" label="이미지 주소" {...form.getInputProps('imageUrl')} />
        <TextInput name="imageAlt" size="md" radius="xl" label="이미지 alt" {...form.getInputProps('imageAlt')} />
        <Button type="submit">등록</Button>
      </Stack>
    )}
  </NewProductScreenForm>
);
