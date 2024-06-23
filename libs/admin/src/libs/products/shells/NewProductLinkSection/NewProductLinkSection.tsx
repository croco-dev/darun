'use client';

import { Button, Stack, TextInput } from '@mantine/core';
import { NewProductLinkForm } from '../../components/NewProductLinkForm';

type NewProductLinkSectionProps = {
  productSlug: string;
};

export const NewProductLinkSection = ({ productSlug }: NewProductLinkSectionProps) => (
  <NewProductLinkForm productSlug={productSlug}>
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    {({ form }: any) => (
      <Stack>
        <TextInput
          name="displayLink"
          size="md"
          label="표시 링크"
          placeholder={'ex) toss.im'}
          {...form.getInputProps('displayLink')}
        />
        <TextInput
          name="link"
          size="md"
          label="링크"
          placeholder={'ex) https://toss.im/'}
          {...form.getInputProps('link')}
        />
        <TextInput
          name="title"
          size="md"
          label="이름"
          placeholder={'ex) 공식 홈페이지'}
          {...form.getInputProps('title')}
        />
        <TextInput
          name="iconUrl"
          size="md"
          label="링크"
          placeholder={
            'ex) https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg'
          }
          {...form.getInputProps('iconUrl')}
        />

        <Button type="submit" size={'md'} color={'dark'}>
          등록
        </Button>
      </Stack>
    )}
  </NewProductLinkForm>
);
