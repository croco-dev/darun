'use client';

import { bind } from '@croco/utils-structure-react';
import { Button } from '@darun/ui';
import { Heart } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CompareButton } from '../CompareButton';
import { useProductUserAction } from './useProductUserAction';

// Simple toast notification
const showToast = (message: string, type: 'success' | 'error') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;
  document.body.appendChild(toast);
  const timerId = setTimeout(() => {
    toast.remove();
  }, 3000);
  return timerId;
};

export const ProductUserAction = bind(
  useProductUserAction,
  ({ voteCount, upvoteProduct, voted, loading, error, slug }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
      if (error) {
        timerRef.current = showToast(error, 'error');
      } else if (voted && !loading) {
        timerRef.current = showToast('투표가 완료되었습니다!', 'success');
      }
    }, [error, voted, loading]);

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    return (
      <div className="flex gap-1">
        <Button variant="shadow" onClick={upvoteProduct} disabled={loading} data-testid="upvote-btn">
          <div className="flex flex-col items-center justify-center gap-1 px-0.5 py-0.5">
            {loading ? (
              <div
                data-testid="upvote-loading"
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"
              />
            ) : error ? (
              <span data-testid="upvote-error" className="text-red-500 text-xs">
                !
              </span>
            ) : (
              <Heart size={18} color={voted ? '#ec4899' : '#555'} fill={voted ? '#ec4899' : '#555'} />
            )}
            <span className="break-keep text-sm font-medium text-dark-700">{voteCount}</span>
          </div>
        </Button>
        <CompareButton slug={slug} />
      </div>
    );
  }
);
