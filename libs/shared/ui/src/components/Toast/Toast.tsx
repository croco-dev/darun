'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

import { AlertCircle, CheckCircle2, X } from '../icons';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({
  children,
  closeAriaLabel = '알림 닫기',
}: {
  children: React.ReactNode;
  closeAriaLabel?: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    const cleanupTimer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
    timerIdsRef.current = [...timerIdsRef.current, cleanupTimer];
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    const exitTimerId = setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    }, 4500);
    const removeTimerId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
    timerIdsRef.current = [...timerIdsRef.current, exitTimerId, removeTimerId];
  }, []);

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 inset-x-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map(toast => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/12 bg-dark-900/95 px-4 py-3 text-white shadow-elevated backdrop-blur-md transition-all motion-reduce:animate-none ${
              toast.exiting ? 'animate-fade-out-down' : 'animate-fade-in-up'
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                toast.type === 'success'
                  ? 'border-leaf-500/30 bg-leaf-500/20 text-leaf-400'
                  : 'border-cherry-500/30 bg-cherry-500/20 text-cherry-400'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={14} className="stroke-[2.5]" aria-hidden="true" />
              ) : (
                <AlertCircle size={14} className="stroke-[2.5]" aria-hidden="true" />
              )}
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/95 break-keep">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="-mr-1 ml-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={closeAriaLabel}
            >
              <X size={14} className="stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
