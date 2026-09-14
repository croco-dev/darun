'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { usePublishProductButton } from './usePublishProductButton';

export const PublishProductButton = bind(usePublishProductButton, ({ loading, isPublished, publishProduct }) => {
  const handleClick = () => {
    publishProduct().catch(() => {});
  };

  return (
    <Button
      onClick={handleClick}
      variant="contained"
      color="secondary"
      disabled={isPublished}
      loading={loading}
      size="sm"
      className="gap-2"
    >
      {isPublished ? '노출 중' : '서비스 노출하기'}
    </Button>
  );
});
