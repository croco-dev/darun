import { bind } from '@croco/utils-structure-react';
import { Button, Group, Select, SelectProps, Stack, TextInput } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useEditProductLinkItem } from './useEditProductLinkItem';

export const EditProductLinkItem = bind(useEditProductLinkItem, ({ form, submit, loading }) => {
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack>
        <TextInput
          name="displayLink"
          size="md"
          label="표시 링크"
          placeholder={'ex) toss.im'}
          key={form.key('displayLink')}
          {...form.getInputProps('displayLink')}
        />
        <TextInput
          name="link"
          size="md"
          label="링크"
          placeholder={'ex) https://toss.im/'}
          key={form.key('link')}
          {...form.getInputProps('link')}
        />
        <TextInput
          name="title"
          size="md"
          label="이름"
          placeholder={'ex) 공식 홈페이지'}
          key={form.key('title')}
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
          key={form.key('iconUrl')}
          {...form.getInputProps('iconUrl')}
        />
        <Group justify="flex-end" mt="md">
          <Button type="submit" color={'dark'} disabled={loading}>
            저장
          </Button>
        </Group>
      </Stack>
    </form>
  );
});

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
