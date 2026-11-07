'use client';

import { Button } from '@/components/ui/button';
import { useTransition } from 'react';

export default function AppDetailError({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();

  return (
    <div role="alert" className="page-shell space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold">앱 정보를 불러오지 못했습니다</h1>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      <Button disabled={pending} onClick={() => startTransition(retry)}>
        {pending ? '불러오는 중...' : '다시 시도'}
      </Button>
    </div>
  );
}
