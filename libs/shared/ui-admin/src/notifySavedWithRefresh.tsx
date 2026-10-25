'use client';

import { notifications } from '@mantine/notifications';
import { useRef, useState } from 'react';

function RefreshRetry({ refresh, notificationId }: { refresh: () => Promise<unknown>; notificationId: string }) {
  const running = useRef(false);
  const [loading, setLoading] = useState(false);
  const retry = async () => {
    if (running.current) return;
    running.current = true;
    setLoading(true);
    try {
      await refresh();
      notifications.update({
        id: notificationId,
        message: '저장된 내용을 새로고침했습니다.',
        color: 'teal',
        autoClose: 4000,
      });
    } catch {
      // Keep the saved result and let the user retry the read again.
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <span>저장은 완료했지만 화면을 새로고침하지 못했습니다.</span>
      <button type="button" className="underline disabled:opacity-50" disabled={loading} onClick={retry}>
        {loading ? '새로고침 중...' : '새로고침 다시 시도'}
      </button>
    </div>
  );
}

/** Report the saved write immediately; a failed read can only retry the read. */
export function notifySavedWithRefresh(refresh: () => Promise<unknown>) {
  const id = notifications.show({
    message: '생성되었습니다.',
    color: 'teal',
    autoClose: false,
  });
  void Promise.resolve()
    .then(refresh)
    .then(() => {
      notifications.update({
        id,
        message: '생성되었습니다.',
        color: 'teal',
        autoClose: 4000,
      });
    })
    .catch(() => {
      notifications.update({
        id,
        color: 'yellow',
        autoClose: false,
        message: <RefreshRetry refresh={refresh} notificationId={id} />,
      });
    });
}
