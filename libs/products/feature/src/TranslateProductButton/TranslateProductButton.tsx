'use client';

import { Button } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useTranslateProductButton } from './useTranslateProductButton';

export const TranslateProductButton = bind(useTranslateProductButton, ({ translateProduct, loading }) => (
  <Button onClick={translateProduct} variant="contained" color="secondary" size="sm" disabled={loading}>
    {loading ? '번역 생성 중...' : 'AI 영문 번역'}
  </Button>
));
