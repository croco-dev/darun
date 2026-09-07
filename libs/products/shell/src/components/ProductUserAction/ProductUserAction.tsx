'use client';

import { Button, Heart, useToast } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useEffect } from 'react';
import { CompareButton } from '../CompareButton';
import { useProductUserAction } from './useProductUserAction';

export const ProductUserAction = bind(
  useProductUserAction,
  ({ voteCount, upvoteProduct, voted, loading, error, slug }) => {
    const { addToast } = useToast();

    useEffect(() => {
      if (error) {
        addToast(error, 'error');
      } else if (voted && !loading) {
        addToast('투표가 완료되었습니다!', 'success');
      }
    }, [error, voted, loading, addToast]);

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="shadow"
          color="secondary"
          size="md"
          onClick={upvoteProduct}
          disabled={loading}
          data-testid="upvote-btn"
          className={voted ? 'border-cherry-300 bg-cherry-50 text-cherry-900 shadow-xs' : ''}
        >
          <div className="flex items-center justify-center gap-1.5">
            {loading ? (
              <div
                data-testid="upvote-loading"
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent motion-reduce:animate-none"
              />
            ) : error ? (
              <span data-testid="upvote-error" className="text-xs text-red-500">
                !
              </span>
            ) : (
              <Heart
                size={18}
                className={voted ? 'fill-cherry-600 text-cherry-600' : 'fill-transparent text-dark-500'}
              />
            )}
            <span
              className={`break-keep text-sm font-semibold tabular-nums ${voted ? 'text-cherry-700' : 'text-dark-700'}`}
            >
              {voteCount}
            </span>
          </div>
        </Button>
        <CompareButton slug={slug} source="direct" />
      </div>
    );
  }
);
