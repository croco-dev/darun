'use client';

import { Button } from '@darun/ui';
import { AdminErrorState, AdminPanel } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
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
            <div className="flex items-center gap-3">
              <Button type="button" variant="contained" color="primary" onClick={() => reset()}>
                다시 시도
              </Button>
              <Button as={Link} href="/" variant="contained" color="secondary">
                대시보드로 이동
              </Button>
            </div>
          }
        />
      </AdminPanel>
    </div>
  );
}
