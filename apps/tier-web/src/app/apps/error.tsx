'use client';

import { Button } from '@/components/ui/button';

export default function AppsError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="page-shell space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold">앱 목록을 불러오지 못했습니다</h1>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
