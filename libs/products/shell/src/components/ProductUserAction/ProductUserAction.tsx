'use client';

import { AlertCircle, Button, Check, Copy, Heart, useToast } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CompareButton } from '../CompareButton';
import { useProductUserAction } from './useProductUserAction';

export const ProductUserAction = bind(
  useProductUserAction,
  ({ voteCount, upvoteProduct, voted, loading, error, slug }) => {
    const { addToast } = useToast();
    const locale = useLocale();
    const t = useTranslations('ProductDetail.action');
    const [copied, setCopied] = useState(false);

    const voteLabel = voted ? t('cancelUpvote') : t('upvote');

    useEffect(() => {
      if (error) {
        addToast(error, 'error');
      } else if (voted && !loading) {
        addToast(t('voteSuccess'), 'success');
      }
    }, [error, voted, loading, addToast, t]);

    const handleCopyLink = async () => {
      if (typeof window === 'undefined') return;
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        addToast(locale === 'ko' ? '링크가 복사되었습니다.' : 'Link copied.', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable
      }
    };

    const copyLabel = copied
      ? locale === 'ko'
        ? '복사됨'
        : 'Copied'
      : locale === 'ko'
        ? '링크 복사'
        : 'Copy link';

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="shadow"
          color="secondary"
          size="md"
          onClick={upvoteProduct}
          disabled={loading}
          data-testid="upvote-btn"
          aria-label={voteLabel}
          aria-pressed={voted}
          title={voteLabel}
          className={`group h-10 sm:h-11 px-3.5 sm:px-4 transition-all duration-200 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none ${
            voted
              ? 'border-cherry-200 bg-cherry-50/90 text-cherry-700 shadow-xs hover:border-cherry-300 hover:bg-cherry-100'
              : 'border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover'
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
                className={`transition-all duration-200 group-hover:scale-110 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none ${
                  voted
                    ? 'fill-cherry-600 text-cherry-600'
                    : 'fill-transparent text-dark-500 group-hover:text-cherry-500'
                }`}
              />
            )}
            <span
              className={`break-keep text-sm font-semibold tabular-nums transition-colors duration-200 ${voted ? 'text-cherry-700' : 'text-dark-700 group-hover:text-dark-900'}`}
            >
              {voteCount}
            </span>
          </div>
        </Button>
        <CompareButton slug={slug} source="direct" />
        <Button
          variant="shadow"
          color="secondary"
          size="md"
          onClick={handleCopyLink}
          data-testid="share-btn"
          aria-label={copyLabel}
          title={copyLabel}
          className="group h-10 sm:h-11 px-3 sm:px-3.5 transition-all duration-200 active:scale-95 border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover"
        >
          <div className="flex items-center justify-center">
            {copied ? (
              <Check size={16} className="text-leaf-600 stroke-[2.25] transition-transform duration-200 scale-110" />
            ) : (
              <Copy
                size={16}
                className="text-dark-500 stroke-[2] transition-transform duration-200 group-hover:scale-110 group-hover:text-dark-900"
              />
            )}
          </div>
        </Button>
      </div>
    );
  }
);
