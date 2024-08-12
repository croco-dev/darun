import { bind } from '@croco/utils-structure-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Button, Group, HoverCard, Stack, Textarea, TextInput } from '@mantine/core';
import { useEditProductFeatureItem } from './useEditProductFeatureItem';

export const EditProductFeatureItem = bind(useEditProductFeatureItem, ({ form, submit, loading }) => {
  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap={'8px'}>
        <TextInput
          label="이모지"
          placeholder="이모지 선택은 우측 버튼으로도 가능 ->"
          key={form.key('emoji')}
          {...form.getInputProps('emoji')}
          rightSection={
            <HoverCard width={360} shadow="md" withArrow openDelay={200} closeDelay={400}>
              <HoverCard.Target>
                <Button color={'dark'}>👆</Button>
              </HoverCard.Target>
              <HoverCard.Dropdown p={0}>
                <Picker
                  data={data}
                  onEmojiSelect={({ native }: { native: string }) => form.setValues({ emoji: native })}
                />
              </HoverCard.Dropdown>
            </HoverCard>
          }
          rightSectionWidth={50}
        />
        <Textarea
          label="기능 이름 (name)"
          placeholder="ex) 송금"
          rows={2}
          key={form.key('name')}
          {...form.getInputProps('name')}
        />
        <Textarea
          label="요약 (summary)"
          placeholder="ex) (앱 이름)은 사용자를 우선하는 송금 경험을 제공합니다. ..."
          rows={2}
          key={form.key('summary')}
          {...form.getInputProps('summary')}
        />
      </Stack>

      <Group justify="flex-end" mt="md">
        <Button type="submit" color={'dark'} disabled={loading}>
          저장
        </Button>
      </Group>
    </form>
  );
});
