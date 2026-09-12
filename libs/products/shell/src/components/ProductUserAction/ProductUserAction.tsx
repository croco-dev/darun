'use client';

import { AlertCircle, Button, Heart, useToast } from '@darun/ui';
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
          aria-label={voted ? '추천 취소' : '추천하기'}
          aria-pressed={voted}
          title={voted ? '추천 취소' : '추천하기'}
          className={`group transition-all duration-200 active:scale-[0.98] ${
            voted
              ? 'border-cherry-300 bg-cherry-50/80 text-cherry-900 shadow-xs hover:bg-cherry-100/70'
              : 'hover:border-dark-300'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            {loading ? (
              <div
                data-testid="upvote-loading"
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent motion-reduce:animate-none"
              />
            ) : error ? (
              <span
                data-testid="upvote-error"
                className="inline-flex items-center justify-center text-cherry-600"
                title={error}
              >
                <AlertCircle size={16} className="stroke-[2.25]" />
              </span>
            ) : (
              <Heart
                size={18}
                className={`transition-transform duration-200 group-hover:scale-110 active:scale-95 ${
                  voted
                    ? 'fill-cherry-600 text-cherry-600'
                    : 'fill-transparent text-dark-500 group-hover:text-cherry-500'
                }`}
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
