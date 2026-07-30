'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { RefreshCw } from 'lucide-react';
import { usePublishProductButton } from './usePublishProductButton';

export const PublishProductButton = bind(usePublishProductButton, ({ loading, isPublished, publishProduct }) => (
  <Button
    onClick={publishProduct}
    variant="contained"
    color="secondary"
    disabled={isPublished || loading}
    size="sm"
    className="gap-2"
  >
    {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
    {isPublished ? '노출 중' : '서비스 노출하기'}
  </Button>
));
