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
        <TextInput
          name="imageUrl"
          size="md"
          label="이미지 주소"
          placeholder={'ex) https://example.com/image.png'}
          {...form.getInputProps('imageUrl')}
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
