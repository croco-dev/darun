import { bind } from '@croco/utils-structure-react';
import { Button, Group, MultiSelect, Stack, TextInput } from '@mantine/core';
import { useEditAlternativeProducts } from './useEditAlternativeProducts';

export const EditAlternativeProducts = bind(
  useEditAlternativeProducts,
  ({ form, submit, selectData, selectedDate, updateQuery }) => (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap={'8px'}>
        <TextInput label="서비스 검색" placeholder="ex) 토스" onChange={updateQuery} />
        <MultiSelect
          label="다른 서비스 (alternatives)"
          placeholder="ex) 대안 서비스들을 연결해주세요."
          key={form.key('alternativeIds')}
          data={selectData}
          {...form.getInputProps('alternativeIds')}
        />
      </Stack>

      <Group justify="flex-end" mt="md">
        <Button type="submit" color={'dark'}>
          저장
        </Button>
      </Group>
    </form>
  )
);
