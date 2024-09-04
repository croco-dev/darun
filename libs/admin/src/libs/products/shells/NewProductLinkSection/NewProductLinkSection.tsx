'use client';

import { Button, Group, Select, SelectProps, Stack, TextInput } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import React from 'react';
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
        <Select
          name="iconUrl"
          size="md"
          label="링크"
          placeholder={
            'ex) https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg'
          }
          data={iconData}
          renderOption={renderSelectOption}
          {...form.getInputProps('iconUrl')}
        />

        <Button type="submit" size={'md'} color={'dark'}>
          등록
        </Button>
      </Stack>
    )}
  </NewProductLinkForm>
);

const iconData = [
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/pvjgv9btsktstjkoarrl.svg',
    label: '지구본 아이콘 (흰색) (주 링크 용도)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/hdo1rx06frvuhf5q0gio.svg',
    label: '인스타그램 (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304777/images/icons/links/i9ea1d250oskdzvu7iby.svg',
    label: 'X(Twitter) (그레이)',
  },
  {
    value: 'https://res.cloudinary.com/dqddtkvmb/image/upload/v1709304776/images/icons/links/kiezpv3buqv7w8xajhw4.svg',
    label: 'GitHub (검정)',
  },
];

const renderSelectOption: SelectProps['renderOption'] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    <img src={option.value} style={{ width: 20, height: 20 }} />
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: 'auto' }} />}
  </Group>
);
