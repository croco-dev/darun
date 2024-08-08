'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@mantine/core';
import { usePublishProductButton } from './usePublishProductButton';

export const PublishProductButton = bind(usePublishProductButton, ({ loading, isPublished, publishProduct }) => (
  <Button
    onClick={publishProduct}
    variant={'light'}
    color={'dark'}
    disabled={isPublished}
    loading={loading}
    size={'compact-sm'}
  >
    {isPublished ? '노출 중' : '서비스 노출하기'}
  </Button>
));
