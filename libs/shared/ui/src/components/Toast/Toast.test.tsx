import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { ToastProvider, useToast } from './Toast';

function TestConsumer({ message, type }: { message: string; type: 'success' | 'error' }) {
  const { addToast } = useToast();

  useEffect(() => {
    addToast(message, type);
  }, [addToast, message, type]);

  return null;
}

describe('ToastProvider', () => {
  it('displays a success toast and removes it', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestConsumer message="저장 완료" type="success" />
      </ToastProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent('저장 완료');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('displays an error toast as an alert', () => {
    render(
      <ToastProvider>
        <TestConsumer message="오류 발생" type="error" />
      </ToastProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('오류 발생');
  });
});
