'use client';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Button, HoverCard, Stack, Textarea, TextInput } from '@mantine/core';
import { NewProductFeatureForm } from '../../components/NewProductFeatureForm';

type NewProductFeatureFormSectionProps = {
  productSlug: string;
};
export const NewProductFeatureFormSection = ({ productSlug }: NewProductFeatureFormSectionProps) => (
  <NewProductFeatureForm productSlug={productSlug}>
    {({ form, pickEmoji }) => (
      <Stack>
        <TextInput
          name="name"
          size="md"
          label="이름"
          form="new-product-form"
          placeholder={'ex) 검색'}
          {...form.getInputProps('name')}
        />
        <TextInput
          name="emoji"
          size="md"
          label="이모지"
          rightSection={
            <HoverCard width={360} shadow="md" withArrow openDelay={200} closeDelay={400}>
              <HoverCard.Target>
                <Button color={'dark'}>뭐쓸까?</Button>
              </HoverCard.Target>
              <HoverCard.Dropdown p={0}>
                <Picker data={data} onEmojiSelect={pickEmoji} />
              </HoverCard.Dropdown>
            </HoverCard>
          }
          rightSectionWidth={92}
          {...form.getInputProps('emoji')}
        />
        <Textarea
          name="summary"
          size="md"
          label="짧은 설명"
          placeholder={'ex) 이러이러해서 이러이러한 기능'}
          autosize
          minRows={4}
          {...form.getInputProps('summary')}
        />
        <Button type="submit" size={'md'} color={'dark'}>
          등록
        </Button>
      </Stack>
    )}
  </NewProductFeatureForm>
);
