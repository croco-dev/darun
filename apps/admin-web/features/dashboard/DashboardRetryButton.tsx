'use client';

import { useRouter } from '@darun/utils-router';
import { useTransition } from 'react';

export function DashboardRetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="mt-2 rounded-lg border border-dark-200 bg-white px-3 py-2 font-medium text-dark-800 hover:bg-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40 disabled:opacity-50"
    >
      {isPending ? '확인 중…' : '다시 시도'}
    </button>
  );
}
