'use client';

import { Button, FileInput, Stack, TextInput } from '@mantine/core';
import { NewProductScreenForm } from '@products/components';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};
export const NewProductScreenshotFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductScreenForm productSlug={productSlug}>
    {({ form }) => (
      <Stack>
        <FileInput
          name="file"
          size="md"
          label="이미지"
          accept="image/png,image/jpeg,image/webp"
          {...form.getInputProps('file')}
        />
        <TextInput
          name="imageAlt"
          size="md"
          label="이미지 alt"
          placeholder={'ex) 서비스 화면 이미지'}
          {...form.getInputProps('imageAlt')}
        />
        <Button type="submit" size="md" color={'dark'}>
          추가!
        </Button>
      </Stack>
    )}
  </NewProductScreenForm>
);
