'use client';

import { Button } from '@darun/ui';
import { AdminErrorState, AdminPanel } from '@darun/ui-admin';
import { useEffect } from 'react';

type ErrorPageProps = {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Admin Root ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="p-8">
      <AdminPanel>
        <AdminErrorState
          title="문제가 발생했습니다."
          error={error}
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
