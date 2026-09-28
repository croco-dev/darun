'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslateProductButton } from './useTranslateProductButton';

export const TranslateProductButton = bind(useTranslateProductButton, ({ translateProduct, loading }) => (
  <Button
    onClick={translateProduct}
    variant="contained"
    color="secondary"
    size="sm"
    disabled={loading}
    className="active:scale-[0.98] motion-reduce:transform-none"
  >
    <span className="whitespace-nowrap">{loading ? '번역 생성 중...' : 'AI 영문 번역'}</span>
  </Button>
));
