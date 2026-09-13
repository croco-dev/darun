'use client';

import { Button } from '@darun/ui';
import { AdminErrorState, AdminPanel } from '@darun/ui-admin';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Admin Root ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="p-8">
      <AdminPanel>
        <AdminErrorState
          title="문제가 발생했습니다."
          description={error.message || '일시적인 오류가 발생했습니다. 다시 시도해주세요.'}
          action={
            <Button type="button" variant="contained" color="primary" onClick={() => reset()}>
              다시 시도
            </Button>
          }
        />
      </AdminPanel>
    </div>
  );
}
