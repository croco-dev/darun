'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
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
    }, 2750);
    const removeTimerId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`px-4 py-3 rounded-xl shadow-elevated text-white motion-reduce:animate-none ${
              toast.exiting ? 'animate-fade-out-down' : 'animate-fade-in-up'
            } ${
              toast.type === 'success' ? 'bg-leaf-700' : 'bg-cherry-700'
            }`}
          >
            <span className="text-sm font-medium">{toast.message}</span>
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
