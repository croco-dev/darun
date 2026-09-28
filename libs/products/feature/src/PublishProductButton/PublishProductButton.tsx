'use client';

import { Button, RefreshCw } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { usePublishProductButton } from './usePublishProductButton';

export const PublishProductButton = bind(usePublishProductButton, ({ loading, isPublished, publishProduct }) => (
  <Button
    onClick={() => {
      publishProduct().catch(() => {});
    }}
    variant="contained"
    color="secondary"
    disabled={isPublished || loading}
    size="sm"
    className="gap-2 active:scale-[0.98] motion-reduce:transform-none"
  >
    {loading ? (
      <RefreshCw size={14} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    ) : null}
    <span className="whitespace-nowrap">{isPublished ? '노출 중' : '서비스 노출하기'}</span>
  </Button>
));
