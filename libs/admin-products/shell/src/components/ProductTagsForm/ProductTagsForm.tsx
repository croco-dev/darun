'use client';

import { bind } from '@croco/utils-structure-react';
import { Button, Flex, TagsInput } from '@mantine/core';
import { useProductTagsForm } from './useProductTagsForm';

export const ProductTagsForm = bind(useProductTagsForm, ({ tags, updateTags, applyTags }) => (
  <Flex direction="row">
    <TagsInput value={tags} onChange={updateTags} />
    <Button onClick={applyTags} color={'dark'}>
      저장
    </Button>
  </Flex>
));
