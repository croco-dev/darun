'use client';

import { Bookmark, Button } from '@darun/ui';
import { useVisualSaveButton } from './useVisualSaveButton';

type VisualSaveButtonProps = {
  kind: 'screenshot' | 'flow';
  id: string;
  enabled: boolean;
};

/**
 * M3 저장 버튼. 로그인 필수 — 미인증 시 로그인 안내 문구 노출.
 */
export function VisualSaveButton({ kind, id, enabled }: VisualSaveButtonProps) {
  const { saved, isToggling, needsLogin, toggle } = useVisualSaveButton({ kind, id, enabled });

  if (needsLogin) {
    return (
      <p className="text-sm text-dark-500 break-words [word-break:keep-all]">저장은 로그인 후 이용할 수 있어요.</p>
    );
  }

  return (
    <Button
      type="button"
      variant={saved ? 'contained' : 'shadow'}
      color="primary"
      size="sm"
      onClick={toggle}
      disabled={isToggling}
      aria-pressed={saved}
      className="active:scale-[0.98] motion-reduce:transform-none"
    >
      <Bookmark size={16} className="shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">{saved ? '저장됨' : '저장하기'}</span>
    </Button>
  );
}
